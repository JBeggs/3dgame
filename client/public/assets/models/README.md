# 3D Avatar Models

## Structure

### Avatar Base
- `avatar/base_mesh.glb` - Base humanoid mesh with skeleton and animations

### Modular Clothing
- `clothing/shirt.glb` - Upper body clothing
- `clothing/pants.glb` - Lower body clothing  
- `clothing/shoes.glb` - Footwear
- `clothing/hat.glb` - Head accessories

### Interactive Items
- `items/grenade.glb` - Throwable grenade
- `items/pan.glb` - Blocking pan/shield

## Requirements

- All clothing items must use the same skeleton as base_mesh.glb
- Keep polygon count under 5,000 triangles per item
- Use compressed textures for web performance
- Items should be UV unwrapped and textured
