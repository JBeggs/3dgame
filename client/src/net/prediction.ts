import * as THREE from 'three';
import { getPhysics } from '../game/physics';
import { getInput } from '../game/input';

// Input command with sequence number for client prediction
export interface InputCommand {
  sequenceNumber: number;
  timestamp: number;
  right: number;
  forward: number;
  jump: boolean;
  action: boolean;
  deltaTime: number;
}

// Player state snapshot for reconciliation
export interface PredictionState {
  sequenceNumber: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  rotation: number;
  timestamp: number;
}

export class ClientPrediction {
  private inputHistory: InputCommand[] = [];
  private stateHistory: PredictionState[] = [];
  private lastAckedSequence = 0;
  private currentSequence = 1;
  private lastInputTime = 0;
  private reconciliationThreshold = 0.2; // 20cm difference triggers reconciliation
  
  // Send input command to server and apply locally
  sendInput(net: any): InputCommand | null {
    const input = getInput();
    const now = performance.now();
    const deltaTime = this.lastInputTime > 0 ? (now - this.lastInputTime) / 1000 : 1/60;
    this.lastInputTime = now;
    
    // Create input command
    const command: InputCommand = {
      sequenceNumber: this.currentSequence++,
      timestamp: now,
      right: input.state.right,
      forward: input.state.forward,
      jump: input.state.jump,
      action: input.state.action,
      deltaTime
    };
    
    // Only send if there's significant input or it's been a while
    const hasInput = Math.abs(command.right) > 0.01 || 
                    Math.abs(command.forward) > 0.01 || 
                    command.jump || 
                    command.action;
    
    const timeSinceLastInput = this.inputHistory.length > 0 ? 
      now - this.inputHistory[this.inputHistory.length - 1].timestamp : 1000;
    
    // DEBUG: Log prediction decisions
    // quiet
    
    if (hasInput || timeSinceLastInput > 100) { // Send at least every 100ms
      // Store input in history
      this.inputHistory.push(command);
      
      // Apply input locally for immediate response (client prediction)
      this.applyInput(command);
      
      // Send to server
      net.sendInputCommand(command);
      
      // FALLBACK: Also send direct position for multiplayer compatibility
      // This ensures other players can see movement even if server doesn't process input commands
      const physics = getPhysics();
      const pos = physics.playerBody.position;
      
      // Debug log occasionally to confirm position sending
      // quiet
      
      net.sendPosition(pos.x, pos.y, pos.z);
      
      return command;
    }
    
    return null;
  }
  
  // Apply an input command to local physics (for prediction and reconciliation)
  private applyInput(command: InputCommand) {
    const physics = getPhysics();
    const { playerBody } = physics;
    
    // Store current state before applying input
    const currentState: PredictionState = {
      sequenceNumber: command.sequenceNumber,
      position: { 
        x: playerBody.position.x, 
        y: playerBody.position.y, 
        z: playerBody.position.z 
      },
      velocity: {
        x: playerBody.velocity.x,
        y: playerBody.velocity.y, 
        z: playerBody.velocity.z
      },
      rotation: 0, // We'll get this from the player controller
      timestamp: command.timestamp
    };
    
    // Apply movement (similar to player.tsx logic)
    const move = new THREE.Vector3(command.right, 0, -command.forward);
    const speed = 5.5;
    if (move.lengthSq() > 1) move.normalize();
    
    // Apply threshold to prevent tiny drift
    const rightInput = Math.abs(command.right) > 0.01 ? command.right : 0;
    const forwardInput = Math.abs(command.forward) > 0.01 ? command.forward : 0;
    const adjustedMove = new THREE.Vector3(rightInput, 0, -forwardInput);
    
    // Accelerate toward desired velocity
    const targetVx = adjustedMove.x * speed;
    const targetVz = adjustedMove.z * speed;
    const accel = 20;
    
    playerBody.velocity.x += (targetVx - playerBody.velocity.x) * Math.min(1, accel * command.deltaTime);
    playerBody.velocity.z += (targetVz - playerBody.velocity.z) * Math.min(1, accel * command.deltaTime);
    
    // Jump
    if (command.jump && physics.isGrounded()) {
      playerBody.velocity.y = 4.5;
    }
    
    // Step physics
    physics.step(command.deltaTime);
    
    // Store state after applying input
    currentState.position.x = playerBody.position.x;
    currentState.position.y = playerBody.position.y;
    currentState.position.z = playerBody.position.z;
    currentState.velocity.x = playerBody.velocity.x;
    currentState.velocity.y = playerBody.velocity.y; 
    currentState.velocity.z = playerBody.velocity.z;
    
    this.stateHistory.push(currentState);
    
    // Cleanup old history (keep last 2 seconds)
    const cutoff = performance.now() - 2000;
    this.inputHistory = this.inputHistory.filter(cmd => cmd.timestamp > cutoff);
    this.stateHistory = this.stateHistory.filter(state => state.timestamp > cutoff);
  }
  
  // Handle server acknowledgment and reconciliation
  reconcileWithServer(serverState: {
    x: number; y: number; z: number; 
    sequenceNumber: number;
    timestamp: number;
  }) {
    this.lastAckedSequence = serverState.sequenceNumber;
    
    // Find our predicted state at the same sequence number
    const predictedState = this.stateHistory.find(
      state => state.sequenceNumber === serverState.sequenceNumber
    );
    
    if (!predictedState) {
      console.log('🔄 No predicted state found for reconciliation');
      return;
    }
    
    // Calculate difference between server and client prediction
    const posDiff = Math.sqrt(
      Math.pow(serverState.x - predictedState.position.x, 2) +
      Math.pow(serverState.y - predictedState.position.y, 2) +
      Math.pow(serverState.z - predictedState.position.z, 2)
    );
    
    // If difference is significant, perform reconciliation
    if (posDiff > this.reconciliationThreshold) {
      console.log(`🔄 Reconciling client prediction - difference: ${posDiff.toFixed(2)}m`);
      console.log(`📍 Server: ${serverState.x.toFixed(2)}, ${serverState.y.toFixed(2)}, ${serverState.z.toFixed(2)}`);
      console.log(`📍 Client: ${predictedState.position.x.toFixed(2)}, ${predictedState.position.y.toFixed(2)}, ${predictedState.position.z.toFixed(2)}`);
      
      // Rollback to server state
      const physics = getPhysics();
      physics.playerBody.position.set(serverState.x, serverState.y, serverState.z);
      
      // Find all inputs after the reconciled sequence
      const inputsToReplay = this.inputHistory.filter(
        cmd => cmd.sequenceNumber > serverState.sequenceNumber
      );
      
      console.log(`🔄 Replaying ${inputsToReplay.length} inputs from sequence ${serverState.sequenceNumber}`);
      
      // Replay inputs to get back to current state
      for (const input of inputsToReplay) {
        this.applyInput(input);
      }
      
      console.log('✅ Client prediction reconciled with server');
    } else {
      // Small difference - just cleanup old states
      this.cleanupOldStates();
    }
  }
  
  // Handle server position correction (overrides prediction)
  handleServerCorrection(serverPos: { x: number; y: number; z: number }) {
    console.log('🚨 Server correction overrides prediction');
    
    // Clear prediction history since server has corrected us
    this.inputHistory = [];
    this.stateHistory = [];
    this.currentSequence = 1;
    
    // Apply server position
    const physics = getPhysics();
    physics.playerBody.position.set(serverPos.x, serverPos.y, serverPos.z);
    physics.playerBody.velocity.set(0, 0, 0);
    
    console.log('✅ Prediction reset after server correction');
  }
  
  private cleanupOldStates() {
    // Remove states older than last acknowledged sequence
    this.stateHistory = this.stateHistory.filter(
      state => state.sequenceNumber > this.lastAckedSequence
    );
    this.inputHistory = this.inputHistory.filter(
      cmd => cmd.sequenceNumber > this.lastAckedSequence  
    );
  }
  
  // Debug info
  getDebugInfo() {
    return {
      inputHistorySize: this.inputHistory.length,
      stateHistorySize: this.stateHistory.length,
      currentSequence: this.currentSequence,
      lastAckedSequence: this.lastAckedSequence,
      reconciliationThreshold: this.reconciliationThreshold
    };
  }
}

// Singleton instance
let predictionInstance: ClientPrediction | null = null;

export function getClientPrediction(): ClientPrediction {
  if (!predictionInstance) {
    predictionInstance = new ClientPrediction();
    
    // Set up event listeners for server reconciliation (only once)
    if (typeof window !== 'undefined') {
      // Handle server input acknowledgments
      window.addEventListener('inputAcknowledged', (event: any) => {
        const { sequenceNumber, position, timestamp } = event.detail;
        predictionInstance?.reconcileWithServer({
          x: position.x,
          y: position.y, 
          z: position.z,
          sequenceNumber,
          timestamp
        });
      });
      
      // Handle server position corrections (overrides prediction)
      window.addEventListener('serverPositionCorrection', (event: any) => {
        const { x, y, z } = event.detail;
        predictionInstance?.handleServerCorrection({ x, y, z });
      });
      
      // Handle server state updates
      window.addEventListener('serverStateUpdate', (event: any) => {
        const { position, sequenceNumber, timestamp } = event.detail;
        predictionInstance?.reconcileWithServer({
          x: position.x,
          y: position.y,
          z: position.z,
          sequenceNumber,
          timestamp
        });
      });
      
      console.log('✅ Client prediction system initialized with server reconciliation');
    }
  }
  return predictionInstance;
}
