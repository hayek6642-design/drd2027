import { renderRecordingsPanel } from './RecordingsPanel.js';

const BROWSER_TREE = [
  {
    name: 'Current Project', icon: '📁',
    children: [
      { name: 'Pattern 1', icon: '🎵' },
      { name: 'Pattern 2', icon: '🎵' },
    ]
  },
  {
    name: 'Plugin Database', icon: '💾',
    children: [
      {
        name: 'Effects', icon: '🎛️',
        children: [
          { name: 'Compressor', icon: '⟐' },
          { name: 'Reverb', icon: '◎' },
          { name: 'Delay', icon: '◷' },
          { name: 'EQ', icon: '≋' },
          { name: 'Distortion', icon: '⚡' },
        ]
      },
      {
        name: 'Instruments', icon: '🎹',
        children: [
          { name: 'Grand Piano', icon: '🎹' },
          { name: 'Arabic Oud', icon: '🎸' },
          { name: 'Strings', icon: '🎻' },
          { name: 'Synthesizer', icon: '🔊' },
        ]
      },
      {
        name: 'Generators', icon: '⚙️',
        children: [
          { name: 'TS404 Bass', icon: '🔊' },
          { name: 'Sytrus', icon: '🔊' },
          { name: 'Harmor', icon: '🔊' },
        ]
      }
    ]
  },
  {
    name: 'Drums', icon: '🥁',
    children: [
      { name: '808 Kick',      icon: '🔊', sample: 'kick'  },
      { name: 'Trap Snare',   icon: '🔊', sample: 'snare' },
      { name: 'Closed Hi-Hat',icon: '🔊', sample: 'hihat' },
      { name: 'Open Hi-Hat',  icon: '🔊', sample: 'hihat' },
      { name: 'Master Clap',  icon: '🔊', sample: 'clap'  },
      { name: 'Rim Shot',     icon: '🔊', sample: 'perc'  },
    ]
  },
  {
    name: 'Bass', icon: '🎸',
    children: [
      { name: 'Sub Bass',    icon: '🔊', sample: 'bass' },
      { name: 'Deep Bass',   icon: '🔊', sample: 'bass' },
      { name: 'Punchy Bass', icon: '🔊', sample: 'bass' },
    ]
  },
  {
    name: 'Instruments', icon: '🎹',
    children: [
      { name: 'Grand Piano', icon: '🎹' },
      { name: 'Arabic Oud',  icon: '🎸' },
      { name: 'Strings',     icon: '🎻' },
    ]
  },
  { name: 'Recent Files', icon: '📂' },
  { name: 'Starred',      icon: '⭐' },
];

const TABS = ['ALL', 'PROJECT', 'PLUGINS', 'SOUNDS', 'REC'];

function renderTreeItem(node, depth, engine) {
  const hasChildren = node.children && node.children.length > 0;
  const id = `tree-${Math.random().toString(36).slice(2)}`;
  const indent = depth * 14;

  const childrenHtml = hasChildren
    ? `<div class="tree-children" id="${id}-children" style="display:${depth < 1 ? 'block' : 'none'}">
        ${node.children.map(c => renderTreeItem(c, depth + 1, engine)).join('')}
       </div>`
    : '';

  return `
    <div class="tree-item-wrap">
      <div class="tree-item" data-id="${id}" data-sample="${node.sample || ''}" style="padding-left:${indent + 6}px">
        <span class="tree-chevron">${hasChildren ? '▸' : ' '}</span>
        <span class="tree-icon">${node.icon || ''}</span>
        <span class="tree-label">${node.name}</span>
        ${node.sample ? `<span class="tree-preview-icon">▶</span>` : ''}
      </div>
      ${childrenHtml}
    </div>
  `;
}

let recPanelEl = null;

export function renderBrowser(el, engine) {
  let activeTab = 'ALL';

  const render = () => {
    const isRec = activeTab === 'REC';

    el.innerHTML = `
      <div class="panel-header">
        <span class="panel-nav">◂ ◃ ◂</span>
        <span class="panel-title">Browser</span>
      </div>
      <div class="browser-tabs">
        ${TABS.map(t => `<button class="browser-tab ${t === activeTab ? 'active' : ''} ${t === 'REC' ? 'rec-tab' : ''}" data-tab="${t}">${t}</button>`).join('')}
      </div>
      ${isRec
        ? `<div class="rec-panel-container" id="rec-panel-container"></div>`
        : `<div class="browser-search">
            <input class="browser-search-input" placeholder="Search..." type="text" />
           </div>
           <div class="browser-tree">
             ${BROWSER_TREE.map(n => renderTreeItem(n, 0, engine)).join('')}
           </div>`
      }
    `;

    if (isRec) {
      recPanelEl = el.querySelector('#rec-panel-container');
      renderRecordingsPanel(recPanelEl);
    }

    el.querySelectorAll('.browser-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        render();
      });
    });

    if (!isRec) {
      el.querySelectorAll('.tree-item').forEach(item => {
        item.addEventListener('click', () => {
          const id = item.dataset.id;
          const children = document.getElementById(`${id}-children`);
          const chevron = item.querySelector('.tree-chevron');
          if (children) {
            const open = children.style.display !== 'none';
            children.style.display = open ? 'none' : 'block';
            if (chevron) chevron.textContent = open ? '▸' : '▾';
          }
          const sample = item.dataset.sample;
          if (sample) engine.previewSample(sample);
        });
      });
    }
  };

  document.addEventListener('recordings-updated', () => {
    if (recPanelEl && recPanelEl.recRefresh) recPanelEl.recRefresh();
  });

  render();
}
