// Types for the modular clothing system

export type ClothingSlot = 'shirt' | 'pants' | 'shoes' | 'hat' | 'accessory';

export interface ClothingItem {
  id: string;
  name: string;
  slot: ClothingSlot;
  modelPath: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
}

export interface ClothingInventory {
  [slot in ClothingSlot]?: ClothingItem[];
}

export interface EquippedClothing {
  [slot in ClothingSlot]?: string; // Item ID
}

export interface ModularAvatarConfig {
  baseModel: 'base_mesh';
  equipped: EquippedClothing;
  colors: {
    skin: string;
    hair: string;
    primary: string;
    secondary: string;
  };
}
