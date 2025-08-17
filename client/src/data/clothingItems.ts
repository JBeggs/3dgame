import { ClothingItem } from '../types/clothing';

// Starter clothing items using existing assets and placeholder items
export const clothingDatabase: ClothingItem[] = [
  // Shirts
  {
    id: 'basic_shirt',
    name: 'Basic Shirt',
    slot: 'shirt',
    modelPath: '/assets/models/clothing/shirt.glb',
    rarity: 'common',
    unlocked: true,
  },
  
  // Pants (using BrainStem model as placeholder)
  {
    id: 'basic_pants',
    name: 'Basic Pants',
    slot: 'pants', 
    modelPath: '/assets/models/clothing/pants.glb',
    rarity: 'common',
    unlocked: true,
  },
  
  // Shoes (using RiggedFigure model as placeholder)
  {
    id: 'basic_shoes',
    name: 'Basic Shoes',
    slot: 'shoes',
    modelPath: '/assets/models/clothing/shoes.glb', 
    rarity: 'common',
    unlocked: true,
  },
  
  // Hats (placeholder - will use fallback)
  {
    id: 'basic_hat',
    name: 'Basic Hat',
    slot: 'hat',
    modelPath: '/assets/models/clothing/hat.glb',
    rarity: 'common', 
    unlocked: true,
  },
];

export const getClothingItem = (id: string): ClothingItem | undefined => {
  return clothingDatabase.find(item => item.id === id);
};

export const getItemsBySlot = (slot: string): ClothingItem[] => {
  return clothingDatabase.filter(item => item.slot === slot && item.unlocked);
};
