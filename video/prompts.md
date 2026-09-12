# «Дом на разбор» — пакет промптов (Seedance 2.0 + GPT Image 2)

Схема «один кадр без склеек»: 7 ключевых кадров K0…K6 и 6 видео S1…S6.
Видео Sn идёт от кадра K(n−1) (start_image) к кадру Kn (end_image), поэтому конец каждого
видео — ровно начало следующего. Камера на каждом шаге облетает дом вправо (~45°).

**Настройки видео:** Seedance 2.0 · mode std · 720p · 9:16 · 5 с (S6 — 8 с) · без звука (`generate_audio: false`) · genre auto (для скролл-ролика).
**Настройки кадров:** GPT Image 2 · 2k · high · 9:16 · каждый кадр — правка предыдущего (reference).
Композиция: дом в верхней половине кадра, нижняя треть — пустая земля (под подписи на сайте).
Лето, солнце сверху слева, голубое небо с облаками, сосновый лес, штабеля на заднем плане.

## Ключевые кадры

| Кадр | Ракурс | Что на доме | job id |
|---|---|---|---|
| K0 | 3/4 спереди справа | готовый дом: блок-хаус, металлическая кровля, окна, дверь, крыльцо | 93394860-5ea6-454a-a6dc-ef83a197e9c3 |
| K1 | правый торец в лоб | белая ветрозащита, проёмы окон и двери | f5bec94e-d6da-4829-a14a-9d449e202b6e |
| K2 | задний правый угол | ОСП-3 на стенах и кровле | d2d847f5-ca0d-4b97-aefe-0be271ef960f |
| K3 | задняя стена | каркас + плиты утеплителя в ячейках | — |
| K4 | задний левый угол | каркас, внутри пароизоляция и вагонка | — |
| K5 | левый торец | голый каркас: стойки, стропила, лаги, пол | — |
| K6 | высоко спереди, взгляд вниз | дома нет — аккуратные штабеля материалов | — |

Общий «замок» каждого кадра:
> Keep all three openings exactly as in the reference photo: the wall that runs away to the left keeps one taller door opening at its far end and one square window opening beside it, and the wall facing the camera keeps its own single square window opening; every window opening floats at waist height with the wall continuing unbroken beneath its sill down to the floor beam, and only the door opening reaches the floor. The roof always carries the same layer as the walls: when a layer leaves the walls it leaves the roof too, and the layer underneath stays stretched under the rafters, so no sky shows through the roof until the skeleton step. Turn the whole scene 45 degrees to the right around the house: both the house and the background behind it — the lumber stacks, the pine forest, the far yard — are seen from the new angle, the background is not copied from the previous frame. Keep the exact same house: same 6 by 6 meter footprint, same steep gable roof shape and pitch, same grey concrete piles, same lumber yard with lumber stacks and green grass, same summer sun, blue sky with white clouds, pine forest, same film look and sharpness. Same drone height 3 meters, same distance, the house fills the upper-middle of the vertical frame and the lower third is empty ground. Calm still moment, nothing in the air.

- **K3:** the drone continues to the back of the house — the long back wall faces the camera, the gable ends are seen at steep angles on both edges. The OSB panels are gone: exposed pine stud frame at 600 mm spacing with pale yellow-green mineral wool insulation slabs filling every bay between the studs; the roof shows rafters with insulation slabs between them.
- **K4:** the drone continues to the back-left corner. The insulation is gone: an open pine stud frame; on the inner face of the walls a translucent grey vapor-barrier film and horizontal light pine interior paneling boards are visible through the studs.
- **K5:** the drone continues to the left gable end, facing it head-on. The film and paneling are gone: a bare timber skeleton — studs, top plates, headers, rafters, ridge board, floor joists and tongue-and-groove floorboards on the platform above the concrete piles.
- **K6:** the drone rises high above the yard and looks down at 45° from the front. The house and the piles are gone; in their place stand neat stacks: planed pine boards and beams in long stacks, a stack of OSB sheets, a stack of plywood sheets, packs of mineral wool slabs in clear plastic, rolls of white membrane, four plastic canisters of wood antiseptic.

## Видео (Seedance 2.0, start = предыдущий кадр, end = следующий)

Собрано скиллом higgsfield (seedance + prompt + camera), каждый промпт прошёл
`seedance_lint.py --preflight` — PASS. Схема Seedance 2.0 проверена вживую (9:16, 720p, std, 4–15 с,
start_image + end_image). В Higgsfield вставлять английский текст целиком, русский — для чтения.

Общий хвост S1–S5 (меняется только точка остановки камеры):
> Camera: a smooth 45-degree aerial orbit to the right, from rest to rest, ending {ТОЧКА}. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the house and the background behind it — the lumber stacks, the pine forest and the far yard — swing 45 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The house stays centred in the upper half of the view at a constant size; the lower third stays open grass. The video runs at 24 fps. No frame is repeated.

*Перевод хвоста:* плавный облёт дрона вправо на 45°, из покоя в покой, до {точки}. Фотореализм, улица, яркое летнее
солнце над складом пиломатериалов у соснового леса, голубое небо с белыми облаками, чёткие тени. **Вся сцена
поворачивается вместе с камерой: дом и фон за ним — штабеля, сосновый лес, двор — разворачиваются на 45° вместе,
фон не остаётся нарисованной задней стенкой.** Один непрерывный кадр, камера сама не режет. Дом по центру верхней половины кадра, размер не меняется; нижняя треть — пустая трава.
24 кадра/с, ни один кадр не повторяется.

### S1 (K0→K1) — блок-хаус · 5 с

```
The rounded log-style pine siding comes off from the top down: the dark metal roof sheets lift off and rise out of view, the siding boards peel away row by row from the eaves, each arcing outward and up, one flying close past the lens, and the glazed window units, door and porch steps lift out last. Midway, the upper walls already show white membrane. The white wind membrane stays taut on walls and roof. By the final second the air is empty and the house stands still.
Camera: a smooth 45-degree aerial orbit to the right, from rest to rest, ending square-on to the right gable end. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the house and the background behind it — the lumber stacks, the pine forest and the far yard — swing 45 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The house stays centred in the upper half of the view at a constant size; the lower third stays open grass. The video runs at 24 fps. No frame is repeated.
```

> Обшивка «под бревно» снимается сверху вниз: сначала поднимаются и уходят из кадра тёмные листы металлической
> кровли, затем доски отходят ряд за рядом от карниза, каждая дугой улетает наружу и вверх, одна пролетает у самого
> объектива; последними вылетают оконные блоки, дверь и ступени крыльца. К середине верх стен уже белый — мембрана.
> Белая ветрозащита остаётся натянутой на стенах и кровле. К последней секунде в воздухе пусто, дом неподвижен.
> Камера останавливается ровно напротив правого торца.

### S2 (K1→K2) — ветрозащита · 5 с

```
The white wind-membrane sheets come away from the roof and walls from the ridge down, billowing outward, rippling and rising as they drift out of view, one sheet passing close beside the camera. Midway, the roof already shows tan OSB while the lower walls are still white. The OSB panels underneath stay fixed to the timber studs. By the final second the air is empty and the house stands still.
Camera: a smooth 45-degree aerial orbit to the right, from rest to rest, ending on the back-right corner, with the right gable end and the back wall both in view. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the house and the background behind it — the lumber stacks, the pine forest and the far yard — swing 45 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The house stays centred in the upper half of the view at a constant size; the lower third stays open grass. The video runs at 24 fps. No frame is repeated.
```

> Белые полотна ветрозащиты отходят от кровли и стен от конька вниз, раздуваются, колышутся и, поднимаясь, уплывают
> из кадра; одно проходит рядом с камерой. К середине кровля уже в ОСП, низ стен ещё белый. ОСП под мембраной
> остаётся на стойках. К последней секунде в воздухе пусто, дом неподвижен. Камера останавливается на заднем правом
> углу — видны правый торец и задняя стена.

### S3 (K2→K3) — ОСП · 5 с

```
The OSB panels come off the roof and walls in quick succession from the ridge down, each turning end over end as it flies outward and upward out of view, one passing close by the lens. Midway, the roof already shows pale mineral wool between the rafters while the lower walls still carry OSB. The mineral wool slabs underneath stay in place between the studs and rafters. By the final second the air is empty and the house stands still.
Camera: a smooth 45-degree aerial orbit to the right, from rest to rest, ending square-on to the long back wall. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the house and the background behind it — the lumber stacks, the pine forest and the far yard — swing 45 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The house stays centred in the upper half of the view at a constant size; the lower third stays open grass. The video runs at 24 fps. No frame is repeated.
```

> Плиты ОСП быстро одна за другой слетают с кровли и стен от конька вниз, каждая кувыркается и улетает наружу и вверх,
> одна проходит у самого объектива. К середине на кровле уже светлый утеплитель между стропилами, низ стен ещё в ОСП.
> Утеплитель остаётся между стойками и стропилами. К последней секунде в воздухе пусто, дом неподвижен. Камера
> останавливается ровно напротив длинной задней стены.

### S4 (K3→K4) — утеплитель · 5 с

```
The mineral wool slabs slide out from between the rafters and studs from the ridge down, turning over in the air as they fly outward and out of view. As they go, the translucent grey vapour-barrier sheeting and light pine interior boards on the inside of the walls come into view, and the roof opens to empty rafters. The studs, sheeting and pine boards stay in place. By the final second the air is empty and the house stands still.
Camera: a smooth 45-degree aerial orbit to the right, from rest to rest, ending on the back-left corner, with the back wall and the left gable end both in view. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the house and the background behind it — the lumber stacks, the pine forest and the far yard — swing 45 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The house stays centred in the upper half of the view at a constant size; the lower third stays open grass. The video runs at 24 fps. No frame is repeated.
```

> Плиты минваты выскальзывают из промежутков между стропилами и стойками от конька вниз, переворачиваются и улетают из
> кадра. Следом с внутренней стороны стен открываются полупрозрачная серая пароизоляция и светлая вагонка, а кровля
> раскрывается до пустых стропил. Стойки, плёнка и вагонка остаются на месте. К последней секунде в воздухе пусто, дом
> неподвижен. Камера останавливается на заднем левом углу — видны задняя стена и левый торец.

### S5 (K4→K5) — пароизоляция и вагонка · 5 с

```
The translucent grey vapour-barrier sheeting peels off the inside of the walls and flutters up between the rafters and out of view; the light pine interior boards follow in quick succession, rising up through the open roof and away. Midway, the upper walls are already open timber studs. The open timber skeleton and the floor platform stay rigid. By the final second the air is empty and the skeleton stands still.
Camera: a smooth 45-degree aerial orbit to the right, from rest to rest, ending square-on to the left gable end. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the house and the background behind it — the lumber stacks, the pine forest and the far yard — swing 45 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The house stays centred in the upper half of the view at a constant size; the lower third stays open grass. The video runs at 24 fps. No frame is repeated.
```

> Серая пароизоляция отходит от внутренней стороны стен и, трепеща, улетает вверх между стропилами; за ней быстро одна
> за другой поднимаются сквозь открытую кровлю доски вагонки. К середине верх стен — уже голые стойки. Каркас и
> площадка пола стоят жёстко. К последней секунде в воздухе пусто, каркас неподвижен. Камера останавливается ровно
> напротив левого торца.

### S6 (K5→K6) — штабеля · 8 с

```
The timber skeleton comes apart from the top down: the ridge and rafters lift off first, then the studs, joists and floorboards, each piece arcing up and over onto neat stacks on the grass where the house stood. The grey concrete foundation posts slide down into the ground. OSB sheets, plywood sheets, wrapped mineral wool packs, rolls of white membrane and four antiseptic canisters, absent from the start image, glide in from beyond the edges of the view onto their own stacks. By the final second everything rests still.
Camera: [0-4s] the drone rises straight up high over the yard; [4-8s] it swings 90 degrees around to the front and tilts down to look at the stacks from 45 degrees above, coming to rest. Style: photoreal exterior, bright summer sun over a lumber yard by a pine forest, blue sky with white clouds, crisp shadows. The whole scene turns with the camera: the stacks and the background behind them — the pine forest and the far yard — swing 90 degrees across the view together, so the background is never a fixed backdrop. One continuous shot, the camera does not cut on its own. The lower third stays open grass. The video runs at 24 fps. No frame is repeated.
```

> Каркас разбирается сверху вниз: сначала конёк и стропила, потом стойки, лаги и доски пола — каждая деталь одной дугой
> перелетает и ложится в аккуратные штабеля на траве там, где стоял дом. Серые бетонные сваи уходят в землю. Листы ОСП,
> фанера, минвата в упаковке, рулоны мембраны и четыре канистры антисептика (их нет на стартовом кадре) влетают из-за
> краёв кадра в свои штабеля. К последней секунде всё неподвижно. Камера: 0–4 с — дрон поднимается прямо вверх;
> 4–8 с — облетает на 90° к фасаду, наклоняется и смотрит на штабеля сверху под 45°, замирает.

### Что поменял относительно черновика

- **Двойные слова.** `frame` означало и каркас, и кадр; `film` — и плёнку, и кино; `piles` рядом со `stacks` читается
  как «кучи» (в S6 модель спутала бы сваи со штабелями); `block-house` по-английски — это блокгауз (военное
  укрепление); `springs`, `like sails`. Всё заменено на слова с одним смыслом.
- **`windows`** линтер валит как бренд (Microsoft) → `glazed window units`.
- **`clear blue sky`** спорило с облаками на кадрах → `blue sky with white clouds`.
- **Середина и финал в каждом ролике.** Без описания промежуточного состояния Seedance перескакивает от первого кадра к
  последнему, будто это склейка; без «к последней секунде в воздухе пусто» детали висят в воздухе на стыке.
- **Камера «из покоя в покой».** На каждом ключевом кадре скорость нулевая, поэтому ролики стыкуются без рывка, а
  остановка приходится на подпись. Точка остановки описана словами, а не как «вид из финального кадра».
- **Всё улетает наружу и вверх**, ничего не падает в нижнюю треть (там подписи).
- **S6:** не было описано, куда деваются сваи (модель просто выключила бы их) → уходят в землю; в список влетающих
  добавлены фанера и канистры; траектория «вверх, потом вниз» заменена одной дугой (иначе модель тянет детали обратно в
  дом); подъём и облёт разнесены по фазам 0–4 / 4–8 с; длительность 8 с вместо 5.
- **Дом и фон поворачиваются вместе на 45°.** Иначе модель крутит только дом, а штабеля, лес и двор остаются как
  нарисованная задняя стенка — облёт перестаёт читаться. Пишем это и в ключевых кадрах, и в хвосте каждого ролика
  (в S6 — на 90°).
- **`24 fps. No frame is repeated.`** — Seedance иногда дублирует кадры, а в скролл-ролике это ощущается как залипание.
