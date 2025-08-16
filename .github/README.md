# CI/CD Setup

## Size Budget Check

The project enforces a **10MB gzipped asset budget** to ensure fast loading times.

### GitHub Actions Workflow

The `size-check.yml` workflow automatically:
- Runs on pushes to `main`/`develop` and pull requests
- Builds the client application  
- Checks total gzipped asset size against 10MB budget
- Fails the build if budget is exceeded
- Uploads size report as artifact

### Local Testing

```bash
# Check current asset size
cd client && npm run size:check

# Check size against budget (fails if over 10MB)
cd client && npm run size:budget
```

### Budget Guidelines

- **Target**: Stay well under 10MB for good performance
- **Warning**: Builds warn when >80% of budget is used
- **Failure**: CI fails when budget is exceeded

### Size Optimization Tips

When approaching the budget limit:
1. Enable asset compression (KTX2 textures, Draco/Meshopt glTF)  
2. Remove unused assets and optimize textures
3. Use lazy loading for non-critical content
4. Consider texture atlasing and instancing
