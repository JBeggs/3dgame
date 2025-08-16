import * as THREE from 'three';
import { AIState } from './behaviors';
import { GridNav, NavPoint, aStar, findNearestWalkable } from './pathfind';

export type GroupRole = 'leader' | 'flanker' | 'supporter' | 'scout';
export type GroupTactic = 'pack_hunt' | 'surround' | 'ambush' | 'retreat' | 'patrol';

export interface GroupMember {
  id: string;
  position: THREE.Vector3;
  role: GroupRole;
  state: AIState;
  alertLevel: number;
  lastUpdateTime: number;
  canSeePlayer: boolean;
  distanceToPlayer: number;
  // Callback to update the individual AI with group instructions
  updateCallback?: (instruction: GroupInstruction) => void;
}

export interface GroupInstruction {
  targetPosition?: THREE.Vector3;
  tactic: GroupTactic;
  priority: number; // 0-1, higher = more important
  formation?: FormationPosition;
}

export interface FormationPosition {
  offsetFromLeader: THREE.Vector3;
  preferredAngle: number; // Radians relative to player direction
  minDistance: number;
  maxDistance: number;
}

export interface GroupAIConfig {
  maxMembers: number;
  communicationRange: number; // Range at which members can share info
  coordinationRadius: number; // Range for coordinated actions
  packHuntThreshold: number; // Min members to trigger pack hunting
  surroundDistance: number; // Preferred distance when surrounding player
}

export class GroupAI {
  private members: Map<string, GroupMember> = new Map();
  private config: GroupAIConfig;
  private grid: GridNav;
  private cellSize: number;
  private currentTactic: GroupTactic = 'patrol';
  private lastTacticChange: number = 0;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private leaderId: string | null = null;
  private sharedPlayerLocation: THREE.Vector3 | null = null;
  private sharedPlayerLastSeen: number = 0;

  constructor(grid: GridNav, cellSize: number, config?: Partial<GroupAIConfig>) {
    this.grid = grid;
    this.cellSize = cellSize;
    this.config = {
      maxMembers: 6,
      communicationRange: 12,
      coordinationRadius: 8,
      packHuntThreshold: 2,
      surroundDistance: 4,
      ...config
    };
  }

  // Add a member to the group
  addMember(member: GroupMember): void {
    if (this.members.size >= this.config.maxMembers) return;
    
    // Assign role based on group composition
    member.role = this.assignRole(member);
    this.members.set(member.id, member);
    
    // First member or reassign leader if current leader is dead/missing
    if (!this.leaderId || !this.members.has(this.leaderId)) {
      this.leaderId = member.id;
      member.role = 'leader';
    }
    
    console.log(`🐺 Added ${member.id} to group as ${member.role} (${this.members.size}/${this.config.maxMembers})`);
  }

  // Remove a member from the group
  removeMember(memberId: string): void {
    this.members.delete(memberId);
    
    // Reassign leader if necessary
    if (this.leaderId === memberId) {
      this.leaderId = this.findNewLeader();
    }
    
    console.log(`🐺 Removed ${memberId} from group (${this.members.size}/${this.config.maxMembers})`);
  }

  // Update the group AI system
  update(deltaTime: number, playerPosition: THREE.Vector3): Map<string, GroupInstruction> {
    this.playerPosition.copy(playerPosition);
    const now = Date.now();
    const instructions = new Map<string, GroupInstruction>();

    // Update member information and share intel
    this.updateMemberInfo();
    this.shareIntelligence();
    
    // Decide group tactic
    const newTactic = this.decideTactic();
    if (newTactic !== this.currentTactic && now - this.lastTacticChange > 2000) {
      this.currentTactic = newTactic;
      this.lastTacticChange = now;
      console.log(`🐺 Group tactic changed to: ${newTactic}`);
    }

    // Generate instructions for each member
    for (const [memberId, member] of this.members) {
      const instruction = this.generateInstruction(member, this.currentTactic);
      if (instruction) {
        instructions.set(memberId, instruction);
      }
    }

    return instructions;
  }

  // Update member information from their individual AI controllers
  updateMember(memberId: string, position: THREE.Vector3, state: AIState, alertLevel: number, canSeePlayer: boolean): void {
    const member = this.members.get(memberId);
    if (!member) return;

    member.position.copy(position);
    member.state = state;
    member.alertLevel = alertLevel;
    member.canSeePlayer = canSeePlayer;
    member.distanceToPlayer = position.distanceTo(this.playerPosition);
    member.lastUpdateTime = Date.now();
  }

  private updateMemberInfo(): void {
    // Remove stale members (haven't updated in a while)
    const now = Date.now();
    const staleThreshold = 5000; // 5 seconds

    for (const [id, member] of this.members) {
      if (now - member.lastUpdateTime > staleThreshold) {
        this.removeMember(id);
      }
    }
  }

  private shareIntelligence(): void {
    // Share player location information between members
    let bestPlayerIntel: { position: THREE.Vector3; time: number } | null = null;

    // Find the best player intel from members who can see the player
    for (const member of this.members.values()) {
      if (member.canSeePlayer && member.lastUpdateTime > (bestPlayerIntel?.time || 0)) {
        bestPlayerIntel = {
          position: member.position.clone(),
          time: member.lastUpdateTime
        };
      }
    }

    // Update shared intel
    if (bestPlayerIntel) {
      this.sharedPlayerLocation = bestPlayerIntel.position;
      this.sharedPlayerLastSeen = bestPlayerIntel.time;
    }
  }

  private decideTactic(): GroupTactic {
    const groupSize = this.members.size;
    if (groupSize === 0) return 'patrol';

    const alertMembers = Array.from(this.members.values()).filter(m => m.alertLevel > 0.3);
    const chasingMembers = Array.from(this.members.values()).filter(m => m.state === 'chase' || m.state === 'attack');
    const averageDistance = Array.from(this.members.values()).reduce((sum, m) => sum + m.distanceToPlayer, 0) / groupSize;

    // Pack hunting: multiple alert members, close to player
    if (groupSize >= this.config.packHuntThreshold && alertMembers.length >= 2 && averageDistance < 10) {
      return 'pack_hunt';
    }

    // Surround: many members, some chasing, medium distance
    if (groupSize >= 3 && chasingMembers.length >= 2 && averageDistance < 8) {
      return 'surround';
    }

    // Ambush: high alert but player not being chased (lost sight)
    if (alertMembers.length >= 2 && chasingMembers.length === 0 && this.sharedPlayerLocation) {
      return 'ambush';
    }

    // Retreat: low numbers or low health
    if (groupSize <= 1 || alertMembers.length === 0) {
      return 'retreat';
    }

    return 'patrol';
  }

  private generateInstruction(member: GroupMember, tactic: GroupTactic): GroupInstruction | null {
    const leader = this.leaderId ? this.members.get(this.leaderId) : null;

    switch (tactic) {
      case 'pack_hunt':
        return this.generatePackHuntInstruction(member, leader);
      
      case 'surround':
        return this.generateSurroundInstruction(member, leader);
      
      case 'ambush':
        return this.generateAmbushInstruction(member, leader);
      
      case 'retreat':
        return this.generateRetreatInstruction(member, leader);
      
      default:
        return this.generatePatrolInstruction(member, leader);
    }
  }

  private generatePackHuntInstruction(member: GroupMember, leader: GroupMember | null): GroupInstruction {
    // Pack hunting: coordinate attack with flanking maneuvers
    const targetPos = this.sharedPlayerLocation || this.playerPosition;
    
    if (member.role === 'leader') {
      // Leader charges straight at player
      return {
        targetPosition: targetPos.clone(),
        tactic: 'pack_hunt',
        priority: 0.9
      };
    } else if (member.role === 'flanker') {
      // Flankers approach from sides
      const angle = member.id.includes('left') ? Math.PI / 2 : -Math.PI / 2;
      const flankDirection = new THREE.Vector3(
        Math.cos(angle) * 3,
        0,
        Math.sin(angle) * 3
      );
      return {
        targetPosition: targetPos.clone().add(flankDirection),
        tactic: 'pack_hunt',
        priority: 0.8,
        formation: {
          offsetFromLeader: flankDirection,
          preferredAngle: angle,
          minDistance: 2,
          maxDistance: 5
        }
      };
    } else {
      // Supporters hang back slightly, ready to assist
      const backoff = targetPos.clone().sub(member.position).normalize().multiplyScalar(-1.5);
      return {
        targetPosition: targetPos.clone().add(backoff),
        tactic: 'pack_hunt',
        priority: 0.6
      };
    }
  }

  private generateSurroundInstruction(member: GroupMember, leader: GroupMember | null): GroupInstruction {
    // Surround: position members in a circle around the player
    const memberArray = Array.from(this.members.values());
    const memberIndex = memberArray.findIndex(m => m.id === member.id);
    const totalMembers = memberArray.length;
    
    const angle = (memberIndex / totalMembers) * Math.PI * 2;
    const surroundPos = this.playerPosition.clone().add(
      new THREE.Vector3(
        Math.cos(angle) * this.config.surroundDistance,
        0,
        Math.sin(angle) * this.config.surroundDistance
      )
    );

    return {
      targetPosition: surroundPos,
      tactic: 'surround',
      priority: 0.8,
      formation: {
        offsetFromLeader: new THREE.Vector3(),
        preferredAngle: angle,
        minDistance: this.config.surroundDistance * 0.8,
        maxDistance: this.config.surroundDistance * 1.2
      }
    };
  }

  private generateAmbushInstruction(member: GroupMember, leader: GroupMember | null): GroupInstruction {
    // Ambush: set up positions to intercept player
    if (!this.sharedPlayerLocation) return this.generatePatrolInstruction(member, leader);

    // Predict player movement and set up intercept positions
    const predictedPos = this.sharedPlayerLocation.clone();
    
    if (member.role === 'scout') {
      // Scouts move towards last known position
      return {
        targetPosition: predictedPos,
        tactic: 'ambush',
        priority: 0.7
      };
    } else {
      // Others set up ambush positions along likely escape routes
      const ambushOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        0,
        (Math.random() - 0.5) * 6
      );
      return {
        targetPosition: predictedPos.add(ambushOffset),
        tactic: 'ambush',
        priority: 0.6
      };
    }
  }

  private generateRetreatInstruction(member: GroupMember, leader: GroupMember | null): GroupInstruction {
    // Retreat: move away from player, regroup at a safe distance
    const retreatDirection = member.position.clone().sub(this.playerPosition).normalize();
    const retreatPos = member.position.clone().add(retreatDirection.multiplyScalar(5));

    return {
      targetPosition: retreatPos,
      tactic: 'retreat',
      priority: 0.5
    };
  }

  private generatePatrolInstruction(member: GroupMember, leader: GroupMember | null): GroupInstruction {
    // Default patrol behavior - maintain loose formation
    const patrolRadius = 4;
    const patrolOffset = new THREE.Vector3(
      (Math.random() - 0.5) * patrolRadius,
      0,
      (Math.random() - 0.5) * patrolRadius
    );
    
    const basePos = leader ? leader.position : member.position;
    return {
      targetPosition: basePos.clone().add(patrolOffset),
      tactic: 'patrol',
      priority: 0.3
    };
  }

  private assignRole(member: GroupMember): GroupRole {
    const memberCount = this.members.size;
    const roles: GroupRole[] = ['leader', 'flanker', 'supporter', 'scout'];
    
    // Assign roles based on group composition
    if (memberCount === 0) return 'leader';
    if (memberCount <= 2) return 'flanker';
    if (memberCount <= 4) return 'supporter';
    return 'scout';
  }

  private findNewLeader(): string | null {
    // Find the member with highest alert level or closest to player
    let bestMember: GroupMember | null = null;
    let bestScore = -1;

    for (const member of this.members.values()) {
      const score = member.alertLevel + (1 / Math.max(member.distanceToPlayer, 1));
      if (score > bestScore) {
        bestScore = score;
        bestMember = member;
      }
    }

    return bestMember?.id || null;
  }

  // Get group statistics for debugging
  getGroupStats() {
    const memberArray = Array.from(this.members.values());
    return {
      size: this.members.size,
      tactic: this.currentTactic,
      leader: this.leaderId,
      averageAlert: memberArray.reduce((sum, m) => sum + m.alertLevel, 0) / Math.max(memberArray.length, 1),
      averageDistance: memberArray.reduce((sum, m) => sum + m.distanceToPlayer, 0) / Math.max(memberArray.length, 1),
      roles: memberArray.reduce((acc, m) => {
        acc[m.role] = (acc[m.role] || 0) + 1;
        return acc;
      }, {} as Record<GroupRole, number>)
    };
  }
}

// Global group AI manager
let groupAIManager: GroupAI | null = null;

export function getGroupAI(): GroupAI | null {
  return groupAIManager;
}

export function createGroupAI(grid: GridNav, cellSize: number, config?: Partial<GroupAIConfig>): GroupAI {
  groupAIManager = new GroupAI(grid, cellSize, config);
  return groupAIManager;
}

export function updateGroupAI(deltaTime: number, playerPosition: THREE.Vector3): Map<string, GroupInstruction> {
  if (!groupAIManager) return new Map();
  return groupAIManager.update(deltaTime, playerPosition);
}
