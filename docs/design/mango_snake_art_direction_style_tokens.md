# Mango Snake — Art Direction, Visual Concept & Style Tokens

> **Version:** 1.0 (Concept Re-skin — Modern Magic Creatures)
>
> **Trạng thái:** Đã chốt hướng Màn hình chính (Home) & Bàn chơi Biome 1 (Aqua Marsh)
>
> **Phạm vi loại trừ (Out of Scope hiện tại):** Thiết kế **Nhân vật chính & Hệ thống Skin (Characters)** sẽ được tách sang một tài liệu thiết kế riêng sau. Tài liệu này chỉ đồng bộ khung UI màn hình `Characters`, chưa chốt tạo hình nhân vật.

## 1. Concept Game: "Duolingo × Sinh Vật Phép Thuật Hiện Đại"

Giữ nguyên 100% logic lõi (`src/core/`), 30 level / 6 Biome, 4 kỹ năng, Checkpoint và hệ thống Marble Machine trong GDD; thay toàn bộ lớp áo thị giác từ phong cách vườn quê/tái xám sang **thế giới đồ chơi sống động của những sinh vật phép thuật siêu "nhây"**.

* **Không làm Fantasy cổ điển nặng nề:** Loại bỏ hoàn toàn phù thủy, cổ ngữ rườm rà, di tích đá rêu phong hay tông màu u tối.

* **Hình khối hiện đại & sạch sẽ (Clean Geometric):** Mọi sinh vật và chướng ngại vật được dựng từ các khối hình học bo tròn, bóng bẩy (glossy highlight), dễ đọc tức thì trên màn hình điện thoại 5 inch.

* **Nhân cách hóa mọi thứ (Cheeky Personality):** Giống phong cách của Duolingo, không chỉ nhân vật mà cả chướng ngại vật (banh gai, khối thạch, bom, chim trộm quả) đều có **mắt to và biểu cảm hài hước** (ngủ gật, cau có, phồng má nhịn nổ, cười đểu) — đồng bộ tuyệt đối với giọng văn "bựa" ở Death Card.

* **Phép thuật kiểu "Pop & Glow":** Phép thuật được thể hiện bằng ánh sáng phát quang mềm (soft glow), đom đóm, bong bóng năng lượng và hiệu ứng thạch nảy tưng tưng.

* **Vật phẩm lõi:**

  * **Mồi ăn (Mango):** Xoài Ma Pháp phát ánh sáng vàng ấm + 2–3 ngôi sao nhỏ lấp lánh xung quanh (Golden Mango có vòng sáng vàng kim/cầu vồng mạnh hơn).

  * **Energy Orb:** Đốm sáng Mana xanh cyan phát quang, ăn vào bắn tia sáng về thanh năng lượng.

## 2. Phong Cách Thiết Kế (Design Principles)

### 2.1. Quy tắc 3 tầng sắc độ (Chữa dứt điểm bệnh "tái xám")

1. **Tầng 1 — Nền ngoài & Bàn chơi (Độ sáng 25%–45%):** Màu đậm nhưng tươi (xanh ngọc sâu, tím mận, xanh chàm) để khóa mắt người chơi vào bàn chơi và không gây mỏi mắt. Nền ngoài luôn đậm hơn sàn bàn chơi 1 nấc.

2. **Tầng 2 — Chướng ngại vật (Độ sáng 50%–75%):** Hình khối tách biệt rõ ràng (tròn có gai, vuông bo góc, trụ năng lượng...), màu tương phản mạnh với nền sàn (tím, hồng san hô, cam rực).

3. **Tầng 3 — Mồi ăn, Mana & Tương tác (Độ sáng 85%–100%):** Bão hòa cao nhất, có vòng sáng `glow` nhẹ bên dưới để mắt nhận diện trong 0.1 giây.

### 2.2. Hệ viền & Độ nổi khối (Tactile Duolingo Style)

* **Viền cùng tông đậm (Tinted Dark Outline):** Tuyệt đối **không dùng đen thuần (`#000000`)**. Mọi vật thể và chữ đều dùng viền cùng họ màu nhưng hạ sáng sâu (ví dụ: chữ/nút xanh ngọc viền `#0A3D42`; xoài vàng viền `#B45309`; banh gai tím viền `#4C1D95`).

* **Độ nổi 3D đáy cứng (Hard Bottom Shadow):** Thay bóng mờ (blur) bằng bóng cứng ở cạnh dưới (`box-shadow: 0 5px 0 <shade-dark>`). Khi người chơi nhấn nút, nút tụt xuống `translateY(4px)` và bóng thu về `1px` tạo cảm giác bấm "đã tay".

* **Chấm bóng nhựa/thạch (Glossy Highlight):** Các nút CTA, nút kỹ năng và sinh vật thạch có 1 vệt sáng trắng bo cong (`rgba(255,255,255,0.45)`) ở góc trên bên trái.

### 2.3. Typography

* **Tiêu đề / Số lớn / Logo:** `Lilita One` (dày, vui nhộn, có viền đậm cùng tông nền khi đặt trên nền màu).

* **UI / Nút bấm / Nhãn HUD / Thoại:** `Nunito` (weight `700`–`900`, chữ rõ ràng, thân thiện).

## 3. Bộ Style Tokens (CSS Variables — Dùng chung DOM & Phaser)

Đặt tại `src/game/dom/styles/tokens.css` (và đồng bộ mã hex sang `src/game/theme/biomeThemes.ts` cho Phaser Canvas).

```
:root {
  /* =========================================
     1. BIOME 1: AQUA MARSH (DEFAULT / HOME)
     ========================================= */
  --bg-outer-top: #0A4D53;
  --bg-outer-mid: #0E6E6E;
  --bg-outer-bottom: #083D42;
  --bg-decor-leaf: rgba(6, 46, 51, 0.45);
  --bg-firefly-glow: #FFE66D;

  --board-border: #0B4649;
  --board-tile-a: #157F75;
  --board-tile-b: #1B9387; /* Tương phản nhẹ 6-8% */

  /* =========================================
     2. UI SURFACES & ELEVATION (DUOLINGO STYLE)
     ========================================= */
  --ui-surface: #FFFFFF;
  --ui-surface-soft: #E6F7F5;
  --ui-surface-shadow: #B8DCDA;
  --ui-outline-dark: #0A3E44;
  --ui-text-dark: #0D3B42;
  --ui-text-muted: #4A7A7F;
  --ui-text-light: #FFFFFF;

  /* =========================================
     3. SEMANTIC ACCENTS & CTA
     ========================================= */
  --cta-primary-bg: #58CC02;
  --cta-primary-top: #74E01B;
  --cta-primary-shadow: #3E8E00;
  --cta-primary-outline: #1D4D00;

  --cta-danger-bg: #FF4B4B;
  --cta-danger-shadow: #CC2929;

  --cta-disabled-bg: #CBD5E1;
  --cta-disabled-shadow: #94A3B8;

  --mango-core: #FFD43B;
  --mango-edge: #F59F00;
  --mango-outline: #9A4800;
  --mango-glow: rgba(255, 212, 59, 0.6);

  --mana-core: #00E5FF;
  --mana-deep: #0097C4;
  --mana-glow: rgba(0, 229, 255, 0.55);

  /* =========================================
     4. SKILL ACCENTS
     ========================================= */
  --skill-slowmo-bg: #18D2F5;
  --skill-slowmo-shadow: #0086AD;
  --skill-snip-bg: #B062FF;
  --skill-snip-shadow: #6D28D9;
  --skill-shield-bg: #3B82F6;
  --skill-shield-shadow: #1D4ED8;
  --skill-rain-bg: #FF9F1C;
  --skill-rain-shadow: #C25E00;

  /* =========================================
     5. HAZARD PALETTE (HIGH CONTRAST)
     ========================================= */
  --hazard-puff-fill: #9D6BFF;
  --hazard-puff-stroke: #4C1D95;
  --hazard-jelly-fill: #FB4D7F;
  --hazard-jelly-stroke: #881337;
  --hazard-cube-fill: #FF922B;
  --hazard-cube-stroke: #9A3412;
  --hazard-bomb-fill: #7C3AED;
  --hazard-bomb-stroke: #3B0764;
  --hazard-warn-ring: #FFEE32;
  --hazard-danger-flash: #FF3B5C;

  /* =========================================
     6. RADII, STROKES, MOTION & TYPOGRAPHY
     ========================================= */
  --radius-pill: 999px;
  --radius-card: 24px;
  --radius-btn: 18px;
  --radius-board: 16px;

  --stroke-ui: 3px;
  --stroke-entity: 3px;
  --depth-btn: 5px;
  --depth-card: 6px;

  --font-display: 'Lilita One', cursive, sans-serif;
  --font-ui: 'Nunito', sans-serif;

  --ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-press: cubic-bezier(0.2, 0, 0, 1);
}

```

### Bảng màu định hướng cho 6 Biome (30 Level)

| Biome | Level | Tên đề xuất | Nền ngoài (`outer`) | Ô bàn chơi (`tile-a` / `tile-b`) | Cảm giác thị giác | 
| ----- | ----- | ----- | ----- | ----- | ----- | 
| **1** | L1–5 | **Aqua Marsh** *(Đã chốt)* | `#0A4D53` → `#083D42` | `#157F75` / `#1B9387` | Xanh ngọc tươi sâu, đom đóm vàng ấm | 
| **2** | L6–10 | **Berry Jelly** | `#3B1254` → `#240938` | `#5B217A` / `#6B288F` | Tím mận bóng bẩy, kẹo thạch neon | 
| **3** | L11–15 | **Mint Frost** | `#0B3B5B` → `#07273E` | `#16688A` / `#1D7A9E` | Xanh biển sâu & bạc hà mát lạnh | 
| **4** | L16–20 | **Sunny Pop** | `#7A3412` → `#54210A` | `#B85A1E` / `#C96828` | Cam đất ấm & mật ong năng động | 
| **5** | L21–25 | **Indigo Plaza** | `#1E1B4B` → `#110E33` | `#312E81` / `#3B3899` | Xanh chàm hiện đại, ánh đèn neon | 
| **6** | L26–30 | **Cosmic Fruit** | `#13092B` → `#090418` | `#24144D` / `#2E1A61` | Tím đêm vũ trụ, độ tương phản tối đa | 

## 4. Chuyển Đổi 16 Họ Chướng Ngại Vật (Modern Cute — Không Fantasy Nặng)

Giữ nguyên 100% cơ chế, hitbox và thời gian cảnh báo trong `src/core/hazards/registry.ts` và `config/balance.json`.

| Key | Tên mới (Modern Cute) | Trạng thái | Hình ảnh, biểu cảm & Telegraph (Cảnh báo) | 
| ----- | ----- | ----- | ----- | 
| `rock` | **Banh Gai Ngủ Gật (Spiky Puff)** | **Đã chốt mẫu** | Vòng sáng tím nhỏ báo rơi → quả cầu gai màu tím mắt nhắm lim dim rơi "bịch" xuống; lúc hết giờ ngáp nhẹ tan thành bong bóng. | 
| `fence` | **Khối Thạch Chặn Đường (Blocky Jellies)** | **Đã chốt mẫu** | Dấu chấm vuông báo vị trí → các khối thạch vuông màu hồng san hô xếp nối liền (L, T, U...), mặt cau có gồng mình chặn đường. | 
| `mud` | **Vũng Thạch Dính (Sticky Goo)** | Chờ vẽ | Vũng chất lỏng màu xanh lime/hồng bóng loáng có bong bóng nổ lách tách; đầu đi qua bị dính bọt sáng và chạy chậm gấp đôi. | 
| `terrain` | **Khối Nảy Lò Xo (Pop-up Cubes)** | **Ưu tiên vẽ tiếp** | Xem đặc tả chi tiết ở mục 4.1 bên dưới. | 
| `ice` | **Ô Băng Bóng (Frost Tiles)** | Chờ vẽ | Ô sàn phủ lớp kính băng xanh trong trẻo có 2 vệt sáng chéo sạch sẽ; trượt qua để lại vệt gió trắng. | 
| `coconut` | **Banh Gai Lăn (Rolling Puffball)** | Chờ vẽ | Cả làn hiện dãy mũi tên vàng neon chạy dọc → một sinh vật tròn xoe mắt hoa thị lăn vèo qua kèm vệt bụi sáng. | 
| `gate` | **Cổng Tia Năng Lượng (Zap Gate)** | Chờ vẽ | Hai trụ tròn cute có mắt nhỏ phát tia laser đóng/mở theo nhịp; dùng Shield húc vào làm 2 trụ choáng váng (mắt xoáy) và tắt hẳn. | 
| `spike` | **Bẫy Gai Bật (Pop Spikes)** | Chờ vẽ | Lỗ tròn kim loại/nhựa trên sàn nhấp nháy đèn đỏ theo nhịp toàn cục → bật chùm gai cam/đỏ tương phản cao lên. | 
| `npc` | **Quái Thạch Béo (Chậm) & Bọ Cánh Cứng (Nhanh)** | Chờ vẽ | Đường ray chấm sáng mờ hiện rõ tuyến tuần tra; 2 sinh vật tròn/oval mắt to sáng bóng đi qua lại với biểu cảm "nhây". | 
| `bird` | **Cú / Dơi Nhỏ Trộm Quả (Sneaky Swooper)** | Chờ vẽ | Bóng tròn thu nhỏ dần trên quả xoài trong 3s → không ăn kịp nó sà xuống gắp quả bay mất kèm mặt cười khẩy. | 
| `bomb` | **Bom Bong Bóng Tím (Pop Bomb)** | **Ưu tiên vẽ tiếp** | Xem đặc tả chi tiết ở mục 4.2 bên dưới. | 
| `maze` | **Mê Cung Khối Lấp Ló (Peekaboo Maze)** | Chờ vẽ | Các ô sàn rực sáng viền tím 2.6s → các khối vuông bo tròn màu đậm (thi thoảng có đôi mắt nhỏ lấp ló) bật lên gọn gàng. | 
| `shrink` | **Viền Bong Bóng Ép Sàn (Bubble Squeeze)** | Chờ vẽ | Viền ngoài sáng đèn cảnh báo 2s → các khối bong bóng năng lượng ép sát vào 1 vòng, đẩy xoài/orb vào trong. | 
| `fixedTerrain` | **Khối Màu Bo Góc (Chunky Blocks)** | Chờ vẽ | Khối hình học 3D nhẹ (đổi màu theo Biome) có viền sáng sạch; dùng Shield húc vỡ tung thành các mảnh hình học. | 
| `rottenRock` | **Quả Xịt Hóa Đá (Stale Fruit)** | Chờ vẽ | Quả xoài để quá hạn sẽ tắt hào quang vàng, xịu mặt hóa xám tím cứng đơ trong 5s. | 
| `snipWall` | **Đuôi Hóa Thạch (Jelly Wall)** | Chờ vẽ | Phần đuôi bị cắt lập tức hóa thành các khối thạch trong suốt cùng màu nhân vật chặn đường 3s rồi nổ "póc". | 

### 4.1. Đặc tả chi tiết mẫu thử tiếp theo: `terrain` — Khối Nảy Lò Xo (Pop-up Cubes)

* **Màu sắc:** Cam sáng `#FF922B`, viền nâu cam đậm `#9A3412`, đỉnh khối có bóng trắng tròn kiểu đồ chơi nhựa cao cấp.

* **3 Trạng thái hình ảnh (theo chu kỳ `periodMs: 3400`):**

  1. **Flat (An toàn):** Ô sàn có nắp vuông chìm màu tối hơn sàn 1 chút, ở giữa có đường rãnh chữ thập nhẹ.

  2. **Warn (Cảnh báo):** Nắp vuông hé sáng viền vàng `#FFEE32`, **hai con mắt tròn xoe hé nhìn lên** và rung nhẹ (dễ đọc ngay cả khi tắt âm hoặc mù màu).

  3. **Raised (Nguy hiểm / Solid):** Khối hộp bật "boing!" cao hẳn lên khỏi mặt sàn (thấy rõ cạnh đáy 3D dày), miệng cười toe toét tinh nghịch; khi sắp thụt xuống thì nháy nhẹ rồi tụt vào sàn.

* **Prompt tạo ảnh tham khảo (đồng bộ màn hình Aqua Marsh):**

  > *2D casual mobile game asset sheet on dark teal checkerboard background, cute modern Duolingo-style chunky geometric creature "Pop-up Cube" obstacle, bright orange glossy rounded square block with dark burnt-orange outline, 3 animation states side by side: (1) flat recessed floor tile, (2) warning state with glowing yellow rim and two wide cheeky eyes peeking out, (3) popped-up 3D chunky cube smiling mischievously, clean vector cartoon style, vibrant saturated colors, no realistic texture.*

### 4.2. Đặc tả chi tiết mẫu thử tiếp theo: `bomb` — Bom Bong Bóng Tím (Pop Bomb)

* **Màu sắc:** Tím đậm bóng loáng `#7C3AED` chuyển sắc tím neon `#A855F7`, viền `#3B0764`, ngòi cháy tia lửa vàng cam `#FFD43B`.

* **3 Trạng thái hình ảnh (đếm ngược `3000ms` → nổ dấu `+` bán kính 2 ô):**

  1. **Landing & Countdown (3s → 1s):** Quả bom tròn mập đáp xuống sàn, có **khuôn mặt phồng hai má đỏ ửng đang cố nhịn nổ**, ngòi xẹt tia lửa. Từ giây cuối, toàn thân phồng to dần theo nhịp tim và chớp trắng/hồng sáng; đồng thời **4 nhánh dấu `+` (bán kính 2 ô)** trên sàn hiện vùng cảnh báo đỏ/vàng mờ để người chơi né chính xác.

  2. **Blast (1 tick):** Vụ nổ hoạt hình hình dấu `+` bằng mây sáng tím–vàng và ngôi sao bay tung tóe (vui mắt, không máu me/khói đen bẩn).

  3. **Shield Defuse (khi dùng Khiên gỡ):** Quả bom xì hơi "pffff", mặt ngơ ngác mắt xoáy rồi biến thành bong bóng bay lên.

* **Prompt tạo ảnh tham khảo (đồng bộ màn hình Aqua Marsh):**

  > *2D casual mobile game asset sheet on dark teal checkerboard background, cute modern Duolingo-style glossy purple round "Pop Bomb" creature with dark purple outline and glowing spark fuse, 3 states: (1) cute chubby purple bomb puffing its rosy cheeks trying not to explode, (2) swollen glowing bright magenta-white about to pop with translucent red-yellow plus-shaped danger tiles on the floor, (3) playful cartoon star-and-bubble plus-shaped explosion, clean vector art, high contrast.*

## 5. Đồng Bộ Thiết Kế Tất Cả Các Màn Hình & Overlay

Toàn bộ màn hình dùng chung một **ngôn ngữ thị giác từ Màn hình chính (Home)**: Nền chuyển sắc xanh ngọc sâu (`Aqua Marsh`) có họa tiết lá chìm ở 4 góc và đom đóm vàng bay chậm + Thẻ nội dung trắng tinh (`#FFFFFF`) có bóng đáy cứng kiểu Duolingo + Nút CTA chính màu xanh lá `#58CC02`.

| Màn hình / Overlay | Nguồn code | Thiết kế đồng bộ mới | 
| ----- | ----- | ----- | 
| **Boot** | `BootScene` | Nền xanh ngọc sâu `--bg-outer-top`, logo `MANGO SNAKE` (font Lilita One vàng/trắng viền đậm) + thanh tải dạng pill bo tròn màu xanh lá/vàng phát sáng. | 
| **Home** *(Đã chốt)* | `homeScreen.ts` | Nền xanh ngọc sâu có lá chìm & đom đóm; 2 nút tròn trắng nổi khối góc phải (Characters, Settings); logo `MANGO SNAKE`; bong bóng thoại trắng `"Ready for L4!"`; khu vực Mascot trung tâm + quả xoài phát sáng *(chờ art nhân vật)*; nút `PLAY` xanh lá Duolingo lớn; pill `"Next checkpoint at L15"` nền trắng mờ nhẹ bên dưới. | 
| **Characters** *(Chỉ chốt khung UI)* | `charactersScreen.ts` | Bỏ nền trắng xám → dùng nền xanh ngọc sâu đồng bộ Home. Top bar: nút Back tròn trắng, tiêu đề `CHARACTERS` trắng viền đậm, pill đếm Coin màu vàng nổi bật. Khu vực preview nhân vật giữa màn hình đặt trên vòng hào quang sáng mềm *(chờ art skin)*. Lưới 3×2 dùng thẻ trắng tinh bóng đáy cứng; thẻ đang chọn có viền xanh cyan phát sáng. Nút CTA đáy: xanh lá khi `Equip` / vàng cam khi `Buy` / xám sạch có bóng đáy khi `Need more`. | 
| **Loadout** | `loadoutScreen.ts` | Nền xanh ngọc sâu. Phía trên là 2 ô `Slot 1` / `Slot 2` dạng hình tròn lớn viền sáng (Slot 2 hiện ổ khóa cute + nhãn `"Unlock at L6"`). Phía dưới là lưới 2×2 cho 4 thẻ kỹ năng nền trắng, mỗi thẻ mang icon bóng bẩy đúng màu nhận diện (`Slow-mo` cyan, `Tail Snip` tím, `Shield` xanh dương, `Mango Rain` cam) + badge chi phí Mana. Nút `GO / PLAY` xanh lá Duolingo ở đáy. | 
| **Settings** | `settingsScreen.ts` | Khi mở từ Home: nền xanh ngọc sâu + 1 thẻ trắng bo tròn lớn (`24px`) chứa 4 dòng công tắc. Khi mở từ Pause: hiện dạng modal thẻ trắng nổi trên nền mờ. 4 công tắc (`Sound`, `Haptics`, `D-pad`, `Reduced Motion`) dùng kiểu toggle pill bo tròn của Duolingo (bật = xanh lá `#58CC02` nổi khối, tắt = xám mát `#CBD5E1`). | 
| **Game + HUD** *(Đã chốt)* | `HudScene.ts`, `HudTop.ts` | Nền ngoài màu teal đậm hơn sàn bàn chơi 1 nấc + lá chìm ở góc. Top HUD: nút Pause tròn trắng, pill `Level X` trắng, pill Score sao vàng trắng; ngay dưới là thanh tiến độ Quota viền trắng dày, fill vàng xoài. Bàn chơi 17×17 ô cờ xanh ngọc viền đậm `6px`. Bottom HUD: thanh Mana ở giữa có icon tia sét cyan + 2 nút Skill tròn bóng bẩy đúng màu kỹ năng (khi chưa đủ Mana thì giảm độ sáng + hiện vòng tiến độ sạc chứ không bôi xám xịt; đủ Mana thì bật sáng + nảy nhẹ). | 
| **Results** | `resultsScreen.ts` | Bỏ nền trắng xám → nền xanh ngọc sâu (nếu thắng L30 hoặc phá kỷ lục thì thêm tia sáng vàng xoay nhẹ phía sau). Bong bóng thoại nguyên nhân chết ở trên cùng; khu vực biểu cảm nhân vật *(chờ art)*; tiêu đề `GAME OVER` / `VICTORY!` chữ dày viền đậm + số điểm lớn; 1 thẻ trắng gọn gàng chia 3 cột (`LEVEL`, `EATEN`, `BIOME`) + thanh tiến độ tới Checkpoint tiếp theo. Nút `PLAY AGAIN` xanh lá lớn + hàng nút phụ trắng nổi khối (`Home`, `Skills`). | 
| **Countdown Overlay** | `countdownOverlay.ts` | Giữ `pointer-events: none`. Số đếm `3 - 2 - 1 - GO!` bằng font `Lilita One` vàng/trắng viền xanh đậm nảy theo `--ease-pop`, kèm pill nhỏ tên Biome & Level (ví dụ: `Level 4 · Aqua Marsh`). | 
| **Pause Overlay** | `pauseOverlay.ts` | Nền tối mờ `rgba(6, 35, 40, 0.65)` + backdrop blur nhẹ. Modal thẻ trắng bo tròn `24px` có bóng đáy cứng; tiêu đề `Paused`, sub-label `Level X · Biome`, pill Checkpoint nền `--ui-surface-soft`; 3 nút xếp dọc chuẩn Duolingo: `RESUME` (xanh lá), `Settings` (trắng nổi), `Quit run` (đỏ san hô nhạt/đậm rõ nét). | 
| **Death Card Overlay** | `deathCardOverlay.ts` | Nền tối mờ, thẻ thoại lớn nổi bật giữa màn hình với câu thoại "bựa" theo nguyên nhân chết, icon nguyên nhân (ví dụ hình Banh Gai cười đểu hoặc Bom tím xì khói), gợi ý `"Tap anywhere to continue"` nhấp nháy nhẹ sau 250ms. | 
| **Marble Machine (P4b)** | *(Chưa triển khai)* | Đồng bộ kiểu **máy bắn bi đồ chơi phép thuật**: khung máy màu xanh ngọc/tím bo tròn bóng bẩy như máy gắp thú hiện đại, chốt đinh phát sáng khi bi chạm, nút `PUSH` đỏ/vàng to bóng nảy cực mạnh. | 

## 6. Checklist Những Hạng Mục Còn Cần Design (Backlog)

### Ưu tiên 1 — Hoàn thiện Gameplay Biome 1–2 & UI cốt lõi

* \[ \] **Áp dụng `tokens.css` & `biomeThemes.ts`:** Thay toàn bộ màu nền trắng xám/rêu nhạt trong `homeScreen.ts`, `charactersScreen.ts`, `loadoutScreen.ts`, `settingsScreen.ts`, `resultsScreen.ts`, `HudScene.ts`.

* \[ \] **Vẽ & tích hợp Asset 2 Hazard đã chốt:** `rock` (Spiky Puff — warn/solid/crumble) và `fence` (Blocky Jellies — kết nối ô liền mạch).

* \[ \] **Gen mẫu & chốt 2 Hazard ưu tiên:** `terrain` (Pop-up Cubes) và `bomb` (Pop Bomb).

* \[ \] **Vẽ 4 Icon kỹ năng (Skills) đồng bộ style bóng bẩy:** Slow-mo, Tail Snip, Shield, Mango Rain (2 trạng thái: sạc & sẵn sàng).

* \[ \] **Vẽ Mồi ăn & Mana:** Xoài thường, Xoài Vàng (Golden), Xoài Thối hóa đá (`rottenRock`), Energy Orb (Mana Wisp).

### Ưu tiên 2 — Toàn bộ 12 Hazard còn lại & 5 Biome

* \[ \] **Thiết kế 12 Hazard còn lại:** `mud`, `ice`, `coconut`, `gate`, `spike`, `npc` (2 loại), `bird`, `maze`, `shrink`, `fixedTerrain`, `snipWall`.

* \[ \] **Test bảng màu 5 Biome còn lại trên Canvas thật:** Berry Jelly, Mint Frost, Sunny Pop, Indigo Plaza, Cosmic Fruit (kiểm tra độ tương phản với Xoài vàng và mọi Hazard).

* \[ \] **VFX & Juice (P3):** Hạt đom đóm nền, bụi nổ khi ăn xoài, vòng sóng khi vỡ khiên, vệt sáng khi ăn Mana Orb.

### Ưu tiên 3 — Tách luồng riêng (Pending)

* \[ \] **Nhân vật chính & 5+ Skins (Characters):** *(Tạm tách riêng theo yêu cầu — sẽ thiết kế concept đầu + thân + biểu cảm chết/rẽ sau khi chốt phần môi trường và vật cản).*

* \[ \] **Marble Machine UI & Physics Assets (P4b):** Khung máy pachinko, bi ma thuật, bumper, 5 ô thưởng.