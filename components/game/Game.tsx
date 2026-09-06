'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Volume2,
  VolumeX,
  BookOpen,
  Users,
  User,
  Lock,
  Radio,
  Check,
  Play,
  Home,
  RotateCcw,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { BubbleGame, LEVELS } from './engine.js';
import { ParkAudio } from './audio.js';
import { MOVEMENT_BINDINGS, bombPlayer, canMovePlayer } from './input.js';
import {
  Guide,
  LANDMARKS,
  LandmarkDialog,
  GameHUD,
  Result,
  TouchControls,
} from './Interface';
const STORE = 'shougang-bubbles-v1';
const emptyProgress = { unlocked: [false, false, false], stage: 0 };
export default function Game() {
  const host = useRef<HTMLDivElement>(null),
    park = useRef<any>(null),
    engine = useRef<any>(null),
    sound = useRef<any>(null),
    keys = useRef(new Set<string>()),
    activeRef = useRef(false),
    countRef = useRef(0),
    progressRef = useRef(emptyProgress),
    actions = useRef<any>({});
  const [mode, setMode] = useState('solo'),
    [level, setLevel] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [active, setActive] = useState(false),
    [state, setState] = useState<any>(null),
    [paused, setPaused] = useState(false),
    [countdown, setCountdown] = useState(0),
    [audioEnabled, setAudioEnabled] = useState(false),
    [guide, setGuide] = useState(false),
    [landmark, setLandmark] = useState<number | null>(null),
    [progress, setProgress] = useState(emptyProgress),
    [toast, setToast] = useState('');
  const saveProgress = useCallback((next: typeof emptyProgress) => {
    progressRef.current = next;
    setProgress(next);
    park.current?.setUnlocked?.(next.unlocked);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {}
  }, []);
  const pause = useCallback((value: boolean) => {
    if (!activeRef.current || engine.current?.status !== 'playing') return;
    engine.current.paused = value;
    setPaused(value);
    keys.current.clear();
    value
      ? sound.current?.suspend()
      : sound.current?.enabled && sound.current?.start();
  }, []);
  const start = useCallback(
    (chosenMode: string, chosenLevel: number, score = 0) => {
      if (!park.current) return;
      keys.current.clear();
      const game = new BubbleGame({
        mode: chosenMode,
        level: chosenLevel,
        seed: Math.floor(Math.random() * 1e8),
        score,
      });
      engine.current = game;
      activeRef.current = true;
      countRef.current = 3;
      setCountdown(3);
      setActive(true);
      setPaused(false);
      setToast('');
      setState(game.snapshot());
      setMode(chosenMode);
      setLevel(chosenLevel);
      park.current.setPlaying(true);
      park.current.sync(game.snapshot());
      if (sound.current?.enabled) sound.current.start();
    },
    [],
  );
  const home = useCallback(() => {
    keys.current.clear();
    activeRef.current = false;
    setActive(false);
    setPaused(false);
    setCountdown(0);
    countRef.current = 0;
    setToast('');
    const demo = new BubbleGame({ mode: 'duel', seed: 4206 });
    engine.current = demo;
    park.current?.setPlaying(false);
    park.current?.sync(demo.snapshot());
  }, []);
  actions.current = {
    start,
    pause,
    home,
    modalOpen: guide || landmark !== null,
  };
  useEffect(() => {
    let stopped = false,
      frame = 0,
      toastTimer: any;
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (
        raw &&
        Array.isArray(raw.unlocked) &&
        raw.unlocked.length === 3 &&
        Number.isInteger(raw.stage)
      ) {
        const p = {
          unlocked: raw.unlocked.map(Boolean),
          stage: Math.max(0, Math.min(2, raw.stage)),
        };
        progressRef.current = p;
        setProgress(p);
        setLevel(p.stage);
      }
    } catch {}
    sound.current = new ParkAudio();
    import('./scene.js')
      .then(async ({ ParkScene }) => {
        if (stopped || !host.current) return;
        try {
          const { loadParkAssets } = await import('./assets.js');
          const assets = await loadParkAssets();
          if (stopped || !host.current) return;
          park.current = new ParkScene(host.current, assets);
          park.current.reduced = matchMedia(
            '(prefers-reduced-motion: reduce)',
          ).matches;
          park.current.setUnlocked?.(progressRef.current.unlocked);
          engine.current = new BubbleGame({ mode: 'duel', seed: 4206 });
          park.current.sync(engine.current.snapshot());
          setReady(true);
          let prev = performance.now(),
            uiTime = 0,
            lastRevision = -1;
          const loop = (now: number) => {
            if (stopped) return;
            const dt = Math.min((now - prev) / 1000, 0.05);
            prev = now;
            const game = engine.current;
            if (
              activeRef.current &&
              game.status === 'playing' &&
              !game.paused
            ) {
              if (countRef.current > 0) {
                countRef.current = Math.max(0, countRef.current - dt);
                setCountdown(Math.ceil(countRef.current));
              } else {
                for (const [code, id, dx, dz] of MOVEMENT_BINDINGS) {
                  if (
                    keys.current.has(String(code)) &&
                    canMovePlayer(id, game.mode)
                  )
                    game.move(id, dx, dz);
                }
                game.update(dt);
              }
            }
            if (game.revision !== lastRevision) {
              park.current.sync(game.snapshot());
              lastRevision = game.revision;
            }
            for (const event of game.drainEvents()) {
              if (!activeRef.current) continue;
              sound.current.play(event.type);
              park.current.handleEvent?.(event);
              if (event.type === 'core') {
                const p = {
                  ...progressRef.current,
                  unlocked: [...progressRef.current.unlocked],
                };
                p.unlocked[game.level] = true;
                saveProgress(p);
                setToast(`${LEVELS[game.level].landmark}已点亮 · 城市记忆 +1`);
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => setToast(''), 3500);
              }
              if (
                event.type === 'pickup' &&
                event.pickup !== 'core' &&
                event.player === 1
              ) {
                setToast(
                  (
                    {
                      range: '泡泡射程 +1',
                      capacity: '泡泡数量 +1',
                      speed: '移动速度提升',
                      heart: '生命已恢复',
                    } as Record<string, string>
                  )[event.pickup] || '补给已收集',
                );
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => setToast(''), 2000);
              }
              if (event.type === 'finish') {
                keys.current.clear();
                if (event.result === 'won' || event.result === 'complete')
                  saveProgress({
                    ...progressRef.current,
                    stage: Math.max(
                      progressRef.current.stage,
                      Math.min(2, game.level + 1),
                    ),
                  });
                setState(game.snapshot());
              }
            }
            uiTime += dt;
            if (uiTime > 0.09) {
              uiTime = 0;
              if (activeRef.current) {
                const snapshot = game.snapshot();
                setState(snapshot);
                park.current.sync(snapshot);
              }
            }
            park.current.update(dt);
            frame = requestAnimationFrame(loop);
          };
          frame = requestAnimationFrame(loop);
        } catch (e) {
          console.error(e);
          setError(
            '3D 画面无法启动。请在 Chrome、Edge 或 Safari 中启用硬件加速后重试。',
          );
        }
      })
      .catch((e) => {
        console.error(e);
        setError('园区加载失败，请刷新页面重试。');
      });
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      const relevant = [
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'Space',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'NumpadEnter',
        'Escape',
      ];
      if (!relevant.includes(e.code)) return;
      if (e.code === 'Escape') {
        if (actions.current.modalOpen) return;
        if (!e.repeat) actions.current.pause(!engine.current?.paused);
        return;
      }
      if (engine.current?.paused || engine.current?.status !== 'playing')
        return;
      e.preventDefault();
      if (countRef.current > 0) return;
      const player = bombPlayer(e.code, engine.current.mode);
      if (player && !e.repeat) engine.current.placeBomb(player);
      else if (!player) keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => {
      keys.current.clear();
      if (activeRef.current) actions.current.pause(true);
    };
    const visibility = () => {
      if (document.hidden) blur();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    const mc = (document as any).modelContext,
      abort = new AbortController();
    if (mc?.registerTool) {
      const register = (tool: any) => {
        try {
          Promise.resolve(
            mc.registerTool(tool, { signal: abort.signal }),
          ).catch(() => {});
        } catch {}
      };
      register({
        name: 'read_shougang_game',
        description: '读取首钢泡泡游戏的模式、关卡、剩余时间和地标解锁状态。',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          mode: engine.current?.mode,
          status: activeRef.current ? engine.current?.status : 'lobby',
          level: engine.current?.level,
          time: Math.ceil(engine.current?.time || 0),
          unlocked: progressRef.current.unlocked,
        }),
      });
      register({
        name: 'start_shougang_game',
        description: '开始新的单人闯关或本机双人对局，会重置当前对局。',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['solo', 'duel'] },
            level: { type: 'integer', minimum: 0, maximum: 2 },
          },
          required: ['mode'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: any) => {
          if (
            !['solo', 'duel'].includes(input?.mode) ||
            !Number.isInteger(input.level ?? 0) ||
            (input.level ?? 0) < 0 ||
            (input.level ?? 0) > progressRef.current.stage
          )
            throw Error('模式或关卡无效，关卡需先解锁。');
          if (!park.current) throw Error('园区还在加载。');
          actions.current.start(input.mode, input.level ?? 0);
          return {
            status: 'countdown',
            mode: input.mode,
            level: input.level ?? 0,
          };
        },
      });
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(toastTimer);
      park.current?.dispose();
      sound.current?.dispose();
      abort.abort();
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [saveProgress]);
  const toggleAudio = async () => {
    const v = !audioEnabled;
    try {
      await sound.current?.enable(v);
      setAudioEnabled(v);
    } catch {
      setToast('声音暂时无法开启，请重试。');
    }
  };
  return (
    <main className={'game-shell ' + (active ? 'in-match' : '')}>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => (active ? pause(true) : home())}
          aria-label="首钢泡泡计划"
        >
          <span className="brand-icon">
            <i />
            <i />
            <i />
          </span>
          <span>
            首钢<span className="brand-divider">/</span>泡泡计划
            <small>SHOUGANG / BUBBLE NIGHT</small>
          </span>
        </button>
        <div className="park-title">首钢园 · 霓虹泡泡夜</div>
        <div className="header-actions">
          <button
            onClick={() => {
              pause(true);
              setGuide(true);
            }}
          >
            <BookOpen size={16} />
            玩法指南
          </button>
          <button
            onClick={toggleAudio}
            aria-label={audioEnabled ? '关闭声音' : '开启声音'}
            title={audioEnabled ? '关闭声音' : '开启声音'}
          >
            {audioEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </div>
      </header>
      <section className="experience">
        <div
          className="scene-host"
          ref={host}
          aria-label="首钢园三维泡泡游戏场地"
        />
        <div className="scene-shade" />
        {!active ? (
          <>
            <div className="lobby">
              <div className="location">
                <span />
                北京 · 首钢园
              </div>
              <h1>
                首钢园
                <br />
                <em>霓虹泡泡夜</em>
              </h1>
              <p className="intro">
                旧日钢铁，霓虹新生。
                <br />
                放下泡泡，点亮你的首钢记忆。
              </p>
              <Tabs value={mode} onValueChange={(v) => setMode(String(v))}>
                <TabsList className="mode-picker">
                  <TabsTrigger value="solo">
                    <User size={16} />
                    单人闯关
                  </TabsTrigger>
                  <TabsTrigger value="duel">
                    <Users size={16} />
                    一机双人
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {mode === 'solo' && progress.stage > 0 && (
                <div className="level-picker" aria-label="选择已解锁关卡">
                  {LEVELS.slice(0, progress.stage + 1).map((l, i) => (
                    <button
                      key={l.name}
                      className={level === i ? 'selected' : ''}
                      onClick={() => setLevel(i)}
                    >
                      0{i + 1} {l.name}
                    </button>
                  ))}
                </div>
              )}
              <button
                className="start-button"
                disabled={!ready || !!error}
                onClick={() => start(mode, level)}
              >
                {ready
                  ? mode === 'duel'
                    ? '开始双人对决'
                    : level === 0
                      ? '进入首钢园'
                      : `继续探索 · ${LEVELS[level].name}`
                  : '正在连接园区'}
                <ArrowRight size={20} />
              </button>
              <p className="mode-description">
                {mode === 'solo'
                  ? '3 个区域 · 探索地标 · 挑战巡逻机器人'
                  : '同一块键盘 · 两位玩家 · 一场泡泡对决'}
              </p>
              <div className="keyboard-hint">
                <kbd>↑</kbd>
                <div>
                  <kbd>←</kbd>
                  <kbd>↓</kbd>
                  <kbd>→</kbd>
                </div>
                <span>移动</span>
                <kbd className="space">SPACE</kbd>
                <span>放泡泡</span>
              </div>
              {mode === 'duel' && (
                <p className="p2-key-hint">P2 / WASD 移动 · Enter 放泡泡</p>
              )}
            </div>
            <div className="scene-caption">
              <span className="live-dot" />
              工业遗迹 / 夜间探索<small>BEIJING · 39.91° N, 116.16° E</small>
            </div>
          </>
        ) : (
          state && (
            <>
              <GameHUD state={state} onPause={() => pause(true)} />
              {countdown > 0 && !paused && (
                <div className="countdown">
                  <b>{countdown}</b>
                  <span>
                    {mode === 'solo'
                      ? '找到金色核心，避开泡泡冲击'
                      : '准备好了吗？泡泡对决即将开始'}
                  </span>
                </div>
              )}
              {state.status === 'playing' && !paused && mode === 'solo' && (
                <TouchControls
                  press={(k) => {
                    if (countRef.current <= 0) keys.current.add(k);
                  }}
                  release={(k) => keys.current.delete(k)}
                  bomb={() =>
                    countRef.current <= 0 && engine.current?.placeBomb(1)
                  }
                />
              )}{' '}
              {state.status === 'finished' && (
                <Result
                  state={state}
                  onRetry={() => start(mode, level)}
                  onNext={() =>
                    start('solo', Math.min(2, level + 1), state.score)
                  }
                  onHome={home}
                />
              )}
            </>
          )
        )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => location.reload()}>重新加载</button>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            <Check size={16} />
            {toast}
          </div>
        )}
      </section>
      {!active && (
        <footer className="landmark-footer">
          <div className="collection-label">
            <Radio size={19} />
            <span>
              城市记忆<small>等待你来点亮</small>
            </span>
          </div>
          {LANDMARKS.map((l, i) => (
            <button
              className={
                'landmark-item ' + (progress.unlocked[i] ? 'unlocked' : '')
              }
              key={l.name}
              onClick={() => setLandmark(i)}
            >
              <span className="landmark-num">0{i + 1}</span>
              <span>
                {l.name}
                <small>{l.english}</small>
              </span>
              {progress.unlocked[i] ? <Check size={14} /> : <Lock size={14} />}
            </button>
          ))}
          <span className="footer-count">
            0{progress.unlocked.filter(Boolean).length} <i>/ 03</i>
          </span>
        </footer>
      )}
      <Guide open={guide} onOpenChange={setGuide} />
      <LandmarkDialog
        index={landmark}
        unlocked={progress.unlocked}
        onClose={() => setLandmark(null)}
      />
      <Dialog open={paused && !guide} onOpenChange={(v) => !v && pause(false)}>
        <DialogContent
          className="game-dialog pause-dialog"
          showCloseButton={false}
        >
          <span className="modal-kicker">TAKE A BREATHER</span>
          <DialogTitle className="dialog-title">园区暂时静音</DialogTitle>
          <DialogDescription>
            时间已经暂停。准备好了，就继续探索。
          </DialogDescription>
          <button className="start-button" onClick={() => pause(false)}>
            继续游戏
            <Play size={18} />
          </button>
          <button
            className="secondary-button"
            onClick={() => start(mode, level)}
          >
            <RotateCcw size={16} />
            重新开始
          </button>
          <button className="text-button" onClick={home}>
            <Home size={16} />
            返回园区
          </button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
