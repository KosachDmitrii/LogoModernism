import type { EnrichedPack } from './pack-enrichment';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function countLabel(n: number, isRu: boolean): string {
  if (isRu) {
    if (n === 1) return '1 направление';
    if (n >= 2 && n <= 4) return `${n} направления`;
    return `${n} направлений`;
  }
  return n === 1 ? '1 logo direction' : `${n} logo directions`;
}

export function buildBrandGuidelinesHtml(pack: EnrichedPack): string {
  const isRu = pack.locale === 'ru';
  const brand = pack.companyName.trim() || (isRu ? 'Бренд' : 'Brand');
  const territory = pack.selectedTerritory;

  const directionBlocks = pack.directions
    .map((dir) => {
      const hero =
        dir.imageFiles[0] ?? `construction/direction-${dir.rank}.svg`;
      const principleItems =
        dir.principles.length > 0
          ? dir.principles.map((p) => `<li>${escapeHtml(p.name)}</li>`).join('')
          : dir.cues.map((c) => `<li>${escapeHtml(c)}</li>`).join('');
      const territoryName = dir.territory?.name;
      const gallery =
        dir.imageFiles.length > 1
          ? `<div class="gallery">${dir.imageFiles
              .slice(1)
              .map((src) => `<img src="${src}" alt="" class="thumb-sm"/>`)
              .join('')}</div>`
          : '';

      return `
      <section class="card">
        <h3>${isRu ? 'Направление' : 'Direction'} ${dir.rank}
          <span class="mute">· ${(dir.prompt.scores?.promptQuality ?? 0).toFixed(1)}/10</span>
          ${territoryName ? `<span class="mute"> · ${escapeHtml(territoryName)}</span>` : ''}
        </h3>
        <div class="row">
          <img src="${hero}" alt="${escapeHtml(brand)} direction ${dir.rank}" class="hero-logo"/>
          <div class="grow">
            <p class="lead">${escapeHtml(dir.reasoning)}</p>
            <p class="mute">${dir.principles.length ? (isRu ? 'Принципы' : 'Principles') : isRu ? 'Опоры направления' : 'Direction anchors'}</p>
            <ul>${principleItems || `<li>${isRu ? 'Геометрия и ясность' : 'Geometry and clarity'}</li>`}</ul>
            ${gallery}
            <p class="mute files">
              ${dir.hasRaster ? `images/ · ` : ''}
              construction/direction-${dir.rank}.svg ·
              usage/direction-${dir.rank}.svg
            </p>
          </div>
        </div>
      </section>`;
    })
    .join('\n');

  const critique = pack.packCritique;

  return `<!DOCTYPE html>
<html lang="${isRu ? 'ru' : 'en'}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(brand)} — ${isRu ? 'бренд-пакет' : 'brand pack'}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "DM Sans", Helvetica, Arial, sans-serif; color: #18181b; background: #f4f4f5; line-height: 1.55; }
    main { max-width: 880px; margin: 0 auto; padding: 48px 24px 96px; }
    h1 { font-size: 36px; letter-spacing: -0.04em; margin: 0 0 8px; }
    h2 { font-size: 13px; margin: 40px 0 14px; letter-spacing: 0.14em; text-transform: uppercase; color: #71717a; font-weight: 600; }
    h3 { margin: 0 0 16px; font-size: 18px; letter-spacing: -0.02em; }
    .mute { color: #71717a; font-size: 13px; }
    .lead { font-size: 15px; line-height: 1.6; margin: 0 0 14px; }
    .hero { background: #fff; border: 1px solid #e4e4e7; padding: 28px 28px 24px; margin-bottom: 8px; }
    .card { border: 1px solid #e4e4e7; background: #fff; padding: 22px; margin: 12px 0; }
    .row { display: flex; gap: 24px; align-items: flex-start; }
    .grow { flex: 1; min-width: 0; }
    .hero-logo { width: min(240px, 42vw); aspect-ratio: 1; object-fit: contain; background: #fafafa; border: 1px solid #e4e4e7; flex-shrink: 0; padding: 12px; }
    .thumb-sm { width: 72px; height: 72px; object-fit: contain; background: #fafafa; border: 1px solid #e4e4e7; padding: 6px; }
    .gallery { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    ul { margin: 6px 0 0; padding-left: 18px; }
    .files { margin-top: 14px; }
    code { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12px; }
    .score-row { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
    .score { min-width: 88px; }
    .score strong { display: block; font-size: 20px; letter-spacing: -0.03em; }
    @media (max-width: 720px) { .row { flex-direction: column; } .hero-logo { width: 100%; } .grid { grid-template-columns: 1fr; } }
    @media print { body { background: #fff; } .card, .hero { break-inside: avoid; } }
  </style>
</head>
<body>
<main>
  <header class="hero">
    <p class="mute">Logo Modernism · ${isRu ? 'бренд-пакет' : 'brand pack'}</p>
    <h1>${escapeHtml(brand)}</h1>
    <p class="mute">${escapeHtml(pack.industry || '—')} · ${countLabel(pack.directions.length, isRu)}
      ${territory ? ` · ${escapeHtml(territory.name)}` : ''}</p>
    ${territory ? `<p class="lead" style="margin-top:14px">${escapeHtml(territory.thesis)}</p>` : ''}
  </header>

  <h2>${isRu ? '1. Бриф' : '1. Brief'}</h2>
  <div class="card">
    <div class="grid">
      <div><p class="mute">${isRu ? 'Эпоха / стиль' : 'Era / style'}</p><p>${escapeHtml(pack.designBrief.era || pack.directions[0]?.prompt.metadata?.era || '—')}</p></div>
      <div><p class="mute">${isRu ? 'Тип знака' : 'Mark type'}</p><p>${escapeHtml(pack.designBrief.markType || pack.directions[0]?.prompt.metadata?.markType || '—')}</p></div>
      <div><p class="mute">${isRu ? 'Палитра' : 'Palette'}</p><p>${escapeHtml(pack.designBrief.colorPalette || 'black_white')}</p></div>
      <div><p class="mute">${isRu ? 'Сложность' : 'Complexity'}</p><p>${escapeHtml(pack.designBrief.complexity || '—')}</p></div>
    </div>
    ${
      pack.designBrief.clientNotes?.trim()
        ? `<p style="margin-top:16px"><span class="mute">${isRu ? 'Заметки клиента' : 'Client notes'}</span><br/>${escapeHtml(pack.designBrief.clientNotes.trim())}</p>`
        : ''
    }
  </div>

  <h2>${isRu ? '2. Направления' : '2. Directions'}</h2>
  ${directionBlocks}

  <h2>${isRu ? '3. Critique' : '3. Critique'}</h2>
  <div class="card">
    ${
      critique
        ? `<p class="lead">${isRu ? 'Оценка направления' : 'Direction critique'}: <strong>${critique.overallScore.toFixed(1)}/10</strong></p>
           <ul>${(critique.feedback ?? []).slice(0, 6).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
           <div class="score-row">
             <div class="score"><span class="mute">${isRu ? 'Узнаваемость' : 'Recognizability'}</span><strong>${critique.recognizability.toFixed(1)}</strong></div>
             <div class="score"><span class="mute">${isRu ? 'Масштаб' : 'Scale'}</span><strong>${critique.scalability.toFixed(1)}</strong></div>
             <div class="score"><span class="mute">${isRu ? 'Простота' : 'Simplicity'}</span><strong>${critique.simplicity.toFixed(1)}</strong></div>
             <div class="score"><span class="mute">${isRu ? 'Современность' : 'Modernity'}</span><strong>${critique.modernity.toFixed(1)}</strong></div>
           </div>`
        : `<p class="mute">${isRu ? 'Critique недоступен для этой сессии.' : 'Critique unavailable for this session.'}</p>`
    }
  </div>

  <h2>${isRu ? '4. Система файлов' : '4. File system'}</h2>
  <div class="card">
    <ul>
      <li><code>images/</code> — ${isRu ? 'мастер-растр направления (если сгенерирован)' : 'direction master rasters (when generated)'}</li>
      <li><code>construction/</code> — ${isRu ? 'структурный эскиз из DNA брифа (не трассировка PNG)' : 'structural sketch from brief DNA (not a PNG trace)'}</li>
      <li><code>usage/</code> — primary / mono / reverse sheets</li>
      <li><code>system/color.svg</code> — ${isRu ? 'цветовая система' : 'color system'}</li>
      <li><code>presentation.html</code> — ${isRu ? 'презентация клиенту' : 'client presentation'}</li>
      <li><code>client-notes.md</code> — ${isRu ? 'текст для письма' : 'email copy'}</li>
    </ul>
  </div>

  <h2>${isRu ? '5. Правила' : '5. Usage rules'}</h2>
  <div class="card">
    <ul>
      <li>${isRu ? 'Мастер-знак — растр в images/ (или выбранное направление после доработки в векторе).' : 'Master mark is the raster in images/ (or the chosen direction after vector refinement).'}</li>
      <li>${isRu ? 'Не искажать пропорции; clear space ≥ 1 модуль.' : 'Do not distort proportions; clear space ≥ 1 module.'}</li>
      <li>${isRu ? 'Тени, градиенты и фотореализм вне системы.' : 'Shadows, gradients, and photorealism are out of system.'}</li>
      <li>${isRu ? 'Construction SVG — опора для геометрии, не финальный логотип.' : 'Construction SVG is a geometry scaffold, not the final logo.'}</li>
    </ul>
  </div>

  <p class="mute" style="margin-top:40px">${isRu ? 'Собрано в Logo Modernism.' : 'Prepared with Logo Modernism.'}</p>
</main>
</body>
</html>
`;
}

export function buildPresentationHtml(pack: EnrichedPack): string {
  const isRu = pack.locale === 'ru';
  const brand = pack.companyName.trim() || (isRu ? 'Бренд' : 'Brand');
  const n = pack.directions.length;

  const slides = pack.directions
    .map((dir) => {
      const img = dir.imageFiles[0] ?? `construction/direction-${dir.rank}.svg`;
      const anchors =
        dir.principles.length > 0
          ? dir.principles
              .slice(0, 4)
              .map((p) => p.name)
              .join(' · ')
          : dir.cues.slice(0, 4).join(' · ');

      return `
      <section class="slide">
        <p class="kicker">${isRu ? 'Вариант' : 'Option'} ${dir.rank}${dir.territory ? ` · ${escapeHtml(dir.territory.name)}` : ''}</p>
        <img src="${img}" alt="${escapeHtml(brand)}"/>
        <h2>${escapeHtml(brand)}</h2>
        <p>${escapeHtml(dir.reasoning)}</p>
        <p class="mute">${escapeHtml(anchors)}</p>
        <p class="mute">${(dir.prompt.scores?.promptQuality ?? 0).toFixed(1)}/10</p>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${isRu ? 'ru' : 'en'}">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(brand)} — ${isRu ? 'презентация' : 'presentation'}</title>
  <style>
    body { margin: 0; font-family: "DM Sans", Helvetica, Arial, sans-serif; background: #09090b; color: #fafafa; }
    .slide { min-height: 100vh; padding: 64px 48px; box-sizing: border-box; border-bottom: 1px solid #27272a; display: flex; flex-direction: column; justify-content: center; max-width: 920px; margin: 0 auto; }
    img { width: min(480px, 100%); background: #fafafa; margin: 28px 0; padding: 28px; box-sizing: border-box; }
    h1 { font-size: 48px; letter-spacing: -0.04em; margin: 0; }
    h2 { letter-spacing: -0.03em; margin: 0 0 12px; }
    .kicker { color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.14em; font-size: 12px; margin: 0 0 8px; }
    .mute { color: #a1a1aa; }
    .title { min-height: 100vh; display: grid; place-content: center; text-align: center; padding: 48px; gap: 12px; }
  </style>
</head>
<body>
  <section class="title">
    <p class="kicker">Logo Modernism</p>
    <h1>${escapeHtml(brand)}</h1>
    <p class="mute">${countLabel(n, isRu)} · ${escapeHtml(pack.industry || '')}</p>
  </section>
  ${slides}
  <section class="slide">
    <p class="kicker">${isRu ? 'Дальше' : 'Next'}</p>
    <h2>${isRu ? 'Выберите направление' : 'Pick a direction'}</h2>
    <p class="mute">${isRu ? 'Мастер в images/. Construction — структурный эскиз. Полный гайд — brand-guidelines.html.' : 'Master mark in images/. Construction is a structural sketch. Full guide: brand-guidelines.html.'}</p>
  </section>
</body>
</html>
`;
}
