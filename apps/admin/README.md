# FormX Admin Frontend

## API Response Key Normalization (IMPORTANT)

**Warning:**
The FormX backend returns all API responses in `snake_case`. The React/Typescript frontend expects all object property keys to be in `camelCase`.

**All API calls must normalize keys from `snake_case` to `camelCase` before using the data in components.**

### Solution
- Use the `snakeToCamel` utility in `lib/utils.ts` to recursively convert backend API responses.
- This ensures all table rendering, forms, and data logic receive the expected camelCase keys.

### Example (in `lib/api-routings.ts`):
```ts
import { snakeToCamel } from "./utils"
...
const { data } = await api.get(...)
return snakeToCamel(data)
```

**If you skip this step, your data will not render correctly in the UI!**

---

## Project Structure
(Describe structure here...)

## Development
(Development instructions...)