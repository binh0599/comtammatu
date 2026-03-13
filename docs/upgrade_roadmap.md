# Package Upgrade Roadmap

Đây là báo cáo chi tiết về các package đã cũ trong hệ thống (monorepo `comtammatu`), và lộ trình nâng cấp an toàn.

## Tình trạng các package hiện tại (Outdated Packages)

| Package | Phiên bản hiện tại | Phiên bản mới nhất (Latest) | Nơi sử dụng (Dependents) |
| --- | --- | --- | --- |
| `eslint` | 10.0.2 | 10.0.3 | `@comtammatu/web` |
| `postcss` | 8.5.6 | 8.5.8 | `@comtammatu/web` |
| `turbo` | 2.8.12 | 2.8.16 | Root Workspace |
| `@prisma/adapter-pg` | 7.4.2 | 7.5.0 | `@comtammatu/database` |
| `@prisma/client` | 7.4.2 | 7.5.0 | `@comtammatu/database` |
| `prisma` | 7.4.2 | 7.5.0 | `@comtammatu/database` |
| `@supabase/supabase-js` | 2.98.0 | 2.99.1 | `database`, `web`, `shared` |
| `@upstash/redis` | 1.36.3 | 1.37.0 | `@comtammatu/security` |
| `pg` | 8.19.0 | 8.20.0 | `@comtammatu/database` |
| `recharts` | 3.7.0 | 3.8.0 | `@comtammatu/web` |
| `typescript-eslint` | 8.56.1 | 8.57.0 | `@comtammatu/web` |
| `vitest` | 4.0.18 | 4.1.0 | `@comtammatu/shared` |
| `lucide-react` | 0.576.0 | 0.577.0 | `ui`, `web` |
| `@types/node` | 22.19.13 / 25.3.3 | 25.5.0 | `security`, `web` |
| `shadcn` | 3.8.5 | 4.0.6 | `@comtammatu/web` |

## Mức độ và lộ trình nâng cấp (Upgrade Roadmap)

Chúng ta sẽ chia lộ trình nâng cấp thành 3 giai đoạn để phân bổ rủi ro, đảm bảo hệ thống không bị lỗi (breaking changes).

### Mục tiêu Giai Đoạn 1: Nâng cấp an toàn (Patch & Minor Updates)
Đây là các bản cập nhật an toàn, không chứa phá vỡ tương thích (breaking changes). Chú trọng các package lỗi nhỏ và các thư viện core database:
*   **Prisma Ecosystem:** Nâng cấp đồng bộ `prisma`, `@prisma/client`, `@prisma/adapter-pg` từ `7.4.2` lên `7.5.0`
*   **Database & Auth:** Nâng cấp `pg` (lên `8.20.0`), `@supabase/supabase-js` (lên `2.99.1`), `@upstash/redis` (lên `1.37.0`)
*   **UI Plugins:** Nâng cấp `lucide-react` (lên `0.577.0`), `recharts` (lên `3.8.0`)
*   **Linters/Runners:** Nâng cấp `postcss`, `eslint`, `typescript-eslint`, `turbo` lên patch versions.

**Lệnh thực thi:**
```bash
# Ở root directory
pnpm update --filter .\* --latest postcss eslint typescript-eslint turbo @prisma/adapter-pg @prisma/client prisma @supabase/supabase-js @upstash/redis pg recharts lucide-react
```

### Mục tiêu Giai Đoạn 2: Nâng cấp công cụ kiểm thử (Testing Tools)
*   **Vitest:** Nâng cấp `vitest` lên `4.1.0`. Đây là bản cập nhật Minor, đôi khi có thể thay đổi behavior liên quan đến configs hoặc plugins. Cần chạy lại toàn bộ unit tests sau update để đảm bảo 100% rủi ro đã được lường trước.

**Lệnh thực thi:**
```bash
pnpm update --filter @comtammatu/shared vitest@latest
pnpm run test # Chạy để kiểm tra
```

### Mục tiêu Giai Đoạn 3: Nâng cấp có nguy cơ gây lỗi cục bộ (Major/Environment)
*   **shadcn CLI:** Bản nâng cấp tự v3 lên v4 có một số khác biệt trong cấu trúc lệnh và `components.json`. Bạn cần đọc [migration guide](https://ui.shadcn.com/docs/changelog) của shadcn để nắm chi tiết trong trường hợp bạn add commands mới sau này. Tuy nhiên, nó chủ yếu là CLI tool, không tác động lên bundle web của bạn trừ khi bạn chạy lại lệnh `shadcn add ...`.
*   **@types/node:** Hiện tại ở `web` dùng v25.3.3 nhưng `security` dùng v22.19.13. Bản Node.js V22 là bản LTS hiện tại mạnh nhất (Active LTS). Việc chạy `@types/node@25.x` có thể chưa ổn định hoặc bị đánh dấu sai lệch với Node. Tốt nhất ta nên hạ cấp (hoặc fix cứng) `@types/node` chung cho toàn bộ monorepo theo đúng version Node.js đang chạy trên Vercel của dự án (thường là LTS Node 20 hoặc Node 22).

**Lệnh thực thi:**
```bash
# Update shadcn 
pnpm update --filter @comtammatu/web shadcn@latest

# Đưa @types/node về cùng một form chung với Node.js runtime của dự án.
```

Bạn vui lòng kiểm tra xem bạn có muốn tôi thiết lập chạy nâng cấp theo từng giai đoạn trên không? Hay bạn chỉ cần xem báo cáo package này thôi?
