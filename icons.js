// 12×12 도트 아이콘. 한 글자 = 한 픽셀, '.' = 투명. 색은 STYLE.md 팔레트
const PAL = { k: '#6a4636', w: '#fff4dc', c: '#f3dfb8', t: '#d4a373', b: '#b07a52', r: '#d0694e', y: '#f2b84b', u: '#7fb2d9', p: '#e8a0b8', g: '#a6cf63' };

const SPRITES = {
  rice: ['............', '....kkkk....', '...kwwwwk...', '..kwwwwwwk..', '.kkkkkkkkkk.', '.krwrrrrrrk.',
    '.krrrrrrrrk.', '..krrrrrrk..', '...kkkkkk...', '....kttk....', '....kkkk....', '............'],
  cup: ['...t..t.....', '....t..t....', '...t..t.....', '.kkkkkkkk...', '.kbbbbbbkkk.', '.kwwwwwwk.k.',
    '.kwwwwwwk.k.', '.kwwwwwwkkk.', '.kcwwwwwk...', '..kkkkkk....', 'tttttttttt..', '............'],
  bus: ['............', '.kkkkkkkkkk.', '.kyyyyyyyyk.', '.kuukuukuuk.', '.kuukuukuuk.', '.kyyyyyyyyk.',
    '.kyyyyyyyyk.', '.kwyyyyyywk.', '.kkkkkkkkkk.', '..kbk..kbk..', '...k....k...', '............'],
  bag: ['............', '....kkkk....', '...k....k...', '...k....k...', '.kkkkkkkkkk.', '.kppppppppk.',
    '.kppppppppk.', '.kppwwwwppk.', '.kppppppppk.', '.kppppppppk.', '.kkkkkkkkkk.', '............'],
  star: ['.....kk.....', '....kyyk....', '....kyyk....', 'kkkkkyykkkkk', 'kyyyyyyyyyyk', '.kyyyyyyyyk.',
    '..kyyyyyyk..', '..kyyyyyyk..', '.kyyk..kyyk.', 'kyyk....kyyk', 'kkk......kkk', '............'],
  box: ['............', '............', '.kkkkkkkkkk.', '.ktttcctttk.', '.kkkkkkkkkk.', '..kttccttk..',
    '..kttccttk..', '..kttttttk..', '..kttttttk..', '..kttttttk..', '..kkkkkkkk..', '............'],
  house: ['.....kk.....', '....krrk....', '...krrrrk...', '..krrrrrrk..', '.krrrrrrrrk.', 'kkkkkkkkkkkk',
    '.kcccccccck.', '.kcuuccbbck.', '.kcuuccbbck.', '.kcccccbbck.', '.kkkkkkkkkk.', '............'],
  phone: ['...kkkkkk...', '...kuuuuk...', '...kuwuuk...', '...kuuuuk...', '...kuuuuk...', '...kuuuuk...',
    '...kuuuuk...', '...kuuuuk...', '...kcccck...', '...kcbbck...', '...kkkkkk...', '............'],
  cross: ['............', '....kkkk....', '....krrk....', '....krrk....', 'kkkkkrrkkkkk', 'krrrrrrrrrrk',
    'krrrrrrrrrrk', 'kkkkkrrkkkkk', '....krrk....', '....krrk....', '....kkkk....', '............'],
  tv: ['..k......k..', '...k....k...', '....k..k....', 'kkkkkkkkkkkk', 'kuuuuuuuuuuk', 'kuwuuuuuuuuk',
    'kuuuuuuuuuuk', 'kuuuuuuuuuuk', 'kuuuuuuuuuuk', 'kkkkkkkkkkkk', '.k........k.', '............'],
  paw: ['...kk..kk...', '..kbbkkbbk..', '..kbbkkbbk..', 'kk.kk..kk.kk', 'kbbk....kbbk', 'kbbk.kk.kbbk',
    '.kk.kbbk.kk.', '...kbbbbk...', '..kbbbbbbk..', '..kbbbbbbk..', '...kkkkkk...', '............'],
  beer: ['............', '..kkkkkkk...', '..kwwwwwk...', '..kwwwwwkkk.', '..kyyyyyk.k.', '..kyyyyyk.k.',
    '..kyywyyk.k.', '..kyyyyykkk.', '..kyyyyyk...', '..kyyyyyk...', '..kkkkkkk...', '............'],
  lipstick: ['......k.....', '.....krk....', '....krrk....', '....krrk....', '....kkkk....', '...kyyyyk...',
    '...kkkkkk...', '...kppppk...', '...kppppk...', '...kppppk...', '...kkkkkk...', '............'],
  gift: ['...kk..kk...', '..krrkkrrk..', '.kkkkkkkkkk.', '.kpppyypppk.', '.kkkkkkkkkk.', '..kppyyppk..',
    '..kppyyppk..', '..kppyyppk..', '..kppyyppk..', '..kppyyppk..', '..kkkkkkkk..', '............'],
  book: ['............', '..kkkkkkkk..', '..kbuuuuuk..', '..kbuwwwuk..', '..kbuuuuuk..', '..kbuuuuuk..',
    '..kbuuuuuk..', '..kbuuuuuk..', '..kbuuuuuk..', '..kbwwwwwk..', '..kkkkkkkk..', '............'],
  dumbbell: ['............', '............', '............', '.kk......kk.', 'kbbk....kbbk', 'kbbkkkkkkbbk',
    'kbbkttttkbbk', 'kbbkkkkkkbbk', 'kbbk....kbbk', '.kk......kk.', '............', '............'],
  plane: ['.....kk.....', '....kuuk....', '....kuuk....', '..kkkuukkk..', 'kkuuuuuuuukk', 'kuuuuuuuuuuk',
    'kkkkkuukkkkk', '....kuuk....', '...kkuukk...', '..kuuuuuuk..', '..kkkkkkkk..', '............'],
  basket: ['............', '....kkkk....', '...k....k...', '..k......k..', 'kkkkkkkkkkkk', 'kttttttttttk',
    '.ktbtbtbtbk.', '.ktbtbtbtbk.', '.kttttttttk.', '..kkkkkkkk..', '............', '............'],
};

// 카테고리 이름 → 아이콘 (앞에서부터 처음 맞는 것)
const KEYWORDS = [
  [/식비|식사|밥|배달|외식|음식/, 'rice'], [/카페|커피|간식|디저트|음료/, 'cup'], [/교통|택시|버스|지하철|주유|차량/, 'bus'],
  [/통신|휴대폰|폰|인터넷/, 'phone'], [/주거|월세|관리비|공과금|집/, 'house'], [/의료|병원|약국|건강/, 'cross'],
  [/구독|넷플릭스|OTT|유튜브/, 'tv'], [/반려|강아지|고양이|펫/, 'paw'], [/술|맥주|회식|bar/i, 'beer'], [/미용|뷰티|화장품|헤어/, 'lipstick'],
  [/경조사|선물|축의|조의|기념일/, 'gift'], [/교육|책|공부|강의|학원/, 'book'], [/운동|헬스|필라테스|요가/, 'dumbbell'],
  [/여행|숙소|항공/, 'plane'], [/생활|마트|생필품|편의점|장보기/, 'basket'], [/쇼핑|옷|의류|패션/, 'bag'],
  [/문화|약속|여가|취미|영화|데이트|공연|놀이/, 'star'],
];

// 스프라이트 → 같은 색 가로줄을 rect 하나로
const rects = rows => rows.map((row, y) => row.replace(/([^.])\1*/g, (run, ch, x) =>
  `<rect x="${x}" y="${y}" width="${run.length}" height="1" fill="${PAL[ch]}"/>`).replace(/\./g, '')).join('');

const cache = {};
export function pixIcon(name) {
  return (cache[name] ||= `<svg class="pix" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true">${rects(SPRITES[name])}</svg>`);
}

// ---------- 배경: 구름 + 동산 (1픽셀 = 4px) ----------
const CLOUDS = [
  ['....wwww........', '..wwwwwwww.www..', '.wwwwwwwwwwwwwww', 'wwwwwwwwwwwwwwww', '.cccccccccccccc.'],
  ['...www....', '.wwwwwww..', 'wwwwwwwwww', '.cccccccc.'],
];
const P = 4;
export function sceneHTML(widthPx, tops = [36, 120, 200]) {
  const clouds = [[0, tops[0], 70, -20], [1, tops[1], 95, -60], [0, tops[2], 120, -5]].map(([i, top, dur, delay]) => {
    const c = CLOUDS[i];
    return `<svg class="cloud" style="top:${top}px;animation-duration:${dur}s;animation-delay:${delay}s" width="${c[0].length * P}" height="${c.length * P}"
      viewBox="0 0 ${c[0].length} ${c.length}" shape-rendering="crispEdges">${rects(c)}</svg>`;
  }).join('');
  // 동산: 사인파 두 개를 겹쳐 계단 높이로. 뒤(흐림) + 앞(진함) + 앞 꼭대기 하이라이트
  const w = Math.ceil(widthPx / P) + 1, H = 26;
  const layer = (cls, base, amp, f, ph, top) => Array.from({ length: w }, (_, x) => {
    const h = Math.round(base + amp * Math.sin(x * f + ph) + amp * 0.4 * Math.sin(x * f * 2.7 + ph * 3));
    return `<rect class="${cls}" x="${x}" y="${H - h}" width="1" height="${h}"/>` + (top ? `<rect class="hill-t" x="${x}" y="${H - h}" width="1" height="1"/>` : '');
  }).join('');
  return `${clouds}<svg class="hills" width="${w * P}" height="${H * P}" viewBox="0 0 ${w} ${H}" shape-rendering="crispEdges">
    ${layer('hill-b', 16, 6, 0.07, 1.3, false)}${layer('hill-f', 9, 4, 0.11, 0.2, true)}</svg>`;
}
export const catIcon = label => pixIcon(KEYWORDS.find(([re]) => re.test(label))?.[1] ?? 'box');
export const ICON_NAMES = Object.keys(SPRITES);

// 레벨별 들판 색 [배경, 진한 테두리]: 연두 → 새싹 → 민트 → 하늘 → 라벤더 → 핑크 → 복숭아 → 황금 들판 → 노을 → 금빛
export const LEVEL_BG = [['#d5e07b', '#a8c45c'], ['#bfe3a0', '#8fc06a'], ['#a8dcc4', '#74b59a'], ['#a9d3ea', '#76aacb'], ['#c3c6ef', '#9196cf'],
  ['#e8c3e6', '#c38fc0'], ['#f4c7a8', '#d39b74'], ['#f2dc8a', '#cfb255'], ['#f0b98a', '#cf8c58'], ['#ffd86b', '#e0a93a']];
