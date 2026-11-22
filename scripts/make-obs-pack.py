# Архив для эфира: готовая коллекция сцен OBS (Browser Source по ссылкам), ссылки, видео-петли, инструкция.
# python3 scripts/make-obs-pack.py  →  release/LPL-S5-Broadcast/
import json, shutil, os

BASE = 'https://kerno-web.github.io/legends-league/hud/'
OUT = 'release/LPL-S5-Broadcast'
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT + '/video')

scenes = [
    ('LPL Starting Soon', 'starting.html', 'отсчёт до ближайшего матча из таблицы'),
    ('LPL Be Right Back', 'brb.html', 'перерыв'),
    ('LPL Offline', 'offline.html', 'между игровыми днями'),
    ('LPL Thanks For Watching', 'ending.html', 'конец эфира'),
    ('LPL Match Schedule', 'schedule.html', 'матчи дня из таблицы'),
    ('LPL Match Results', 'results.html', 'итоги дня из таблицы'),
    ('LPL Match MVP', 'mvp.html?name=Nickname&k=0&d=0&a=0', 'ник и K/D/A — в ссылке'),
    ('LPL Casters', 'casters.html?c1=Caster%201&c2=Caster%202', 'две камеры кастеров, ники в ссылке'),
    ('LPL Studio Camera', 'camera.html', 'одна камера'),
    ('LPL Studio Camera Draft', 'camera.html?v=draft', 'камера сверху, низ под драфт'),
]

sources = []
for i, (name, path, _) in enumerate(scenes, 1):
    src = 'HUD ' + name[4:]
    sources.append({
        'id': 'browser_source', 'versioned_id': 'browser_source', 'name': src, 'uuid': f'00000000-0000-4000-8000-0000000001{i:02d}',
        'enabled': True, 'flags': 0, 'muted': False, 'volume': 1.0, 'mixers': 255, 'sync': 0, 'hotkeys': {}, 'private_settings': {},
        'settings': {'url': BASE + path, 'width': 1920, 'height': 1080, 'fps_custom': False,
                     'restart_when_active': True, 'shutdown': False, 'reroute_audio': False, 'css': ''},
    })
    sources.append({
        'id': 'scene', 'versioned_id': 'scene', 'name': name, 'uuid': f'00000000-0000-4000-8000-0000000002{i:02d}',
        'enabled': True, 'flags': 0, 'muted': False, 'volume': 1.0, 'mixers': 0, 'sync': 0, 'hotkeys': {}, 'private_settings': {},
        'settings': {'id_counter': 1, 'custom_size': False, 'items': [{
            'name': src, 'source_uuid': f'00000000-0000-4000-8000-0000000001{i:02d}', 'id': 1, 'visible': True, 'locked': False,
            'pos': {'x': 0.0, 'y': 0.0}, 'scale': {'x': 1.0, 'y': 1.0}, 'rot': 0.0, 'align': 5,
            'bounds_type': 0, 'bounds': {'x': 0.0, 'y': 0.0}, 'bounds_align': 0,
            'crop_left': 0, 'crop_top': 0, 'crop_right': 0, 'crop_bottom': 0, 'blend_type': 'normal', 'blend_method': 'default',
        }]},
    })

collection = {
    'name': 'LPL S5 Broadcast', 'current_scene': scenes[0][0], 'current_program_scene': scenes[0][0],
    'scene_order': [{'name': s[0]} for s in scenes], 'sources': sources, 'groups': [],
    'transitions': [], 'current_transition': 'Fade', 'transition_duration': 400,
    'quick_transitions': [], 'saved_projectors': [], 'preview_locked': False, 'scaling_enabled': False,
    'scaling_level': 0, 'scaling_off_x': 0.0, 'scaling_off_y': 0.0, 'modules': {},
}
json.dump(collection, open(OUT + '/LPL-S5-OBS-Scenes.json', 'w'), ensure_ascii=False, indent=2)

links = ['LPL S5 — ссылки сцен (OBS → Источник «Браузер», 1920 × 1080)', '', 'Пульт с превью и конструктором ссылок: ' + BASE + 'index.html', '']
for name, path, note in scenes:
    links.append(f'{name[4:]:<22} {BASE + path}')
    links.append(f'{"":<22} — {note}')
open(OUT + '/LINKS.txt', 'w').write('\n'.join(links) + '\n')

for f in os.listdir('release/LPL-S5-HUD/video'):
    if f.endswith('.mp4'):
        shutil.copy(f'release/LPL-S5-HUD/video/{f}', f'{OUT}/video/{f}')
print('ok', len(scenes), 'scenes')
