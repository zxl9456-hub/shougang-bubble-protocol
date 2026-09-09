import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../ui/dialog';
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Home,
  Check,
  Diamond,
  Zap,
  Droplets,
  Trophy,
  X,
  Lock,
  ShieldAlert,
  Factory,
  Waves,
  Mountain,
} from 'lucide-react';
import { LEVELS } from './engine.js';
export const LANDMARKS = [
  {
    name: '三高炉',
    english: 'BLAST FURNACE / 03',
    text: '纵横的管道、层叠的钢架，留下钢铁时代的记忆。首钢三高炉经过改造，如今成为展览与文化活动空间。',
  },
  {
    name: '冷却塔',
    english: 'COOLING TOWER / 02',
    text: '巨大的双曲线塔身是旧厂区的标志之一。停用的冷却塔与冬奥赛场相邻，工业遗产构成了独特的城市天际线。',
  },
  {
    name: '雪飞天',
    english: 'BIG AIR / 01',
    text: '首钢滑雪大跳台又称“雪飞天”，造型灵感来自敦煌飞天。在这里，冬奥场馆与工业遗址相遇。',
  },
];
export function Controls({ duel = false }: { duel?: boolean }) {
  return (
    <div className="control-rows">
      <div>
        <b className="p1-text">P1</b>
        <kbd>↑</kbd>
        <kbd>←</kbd>
        <kbd>↓</kbd>
        <kbd>→</kbd>
        <span>移动</span>
        <kbd>空格</kbd>
        <span>泡泡</span>
      </div>
      {duel && (
        <div>
          <b className="p2-text">P2</b>
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd>
          <span>移动</span>
          <kbd>Enter</kbd>
          <span>泡泡</span>
        </div>
      )}
    </div>
  );
}
export function Guide({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="game-dialog guide-dialog"
        showCloseButton={false}
      >
        <DialogClose className="dialog-x" aria-label="关闭玩法指南">
          <X size={20} />
        </DialogClose>
        <span className="modal-kicker">FIELD MANUAL</span>
        <DialogTitle className="dialog-title">欢迎来到首钢园</DialogTitle>
        <DialogDescription className="dialog-subtitle">
          一颗泡泡，唤醒一段城市记忆。
        </DialogDescription>
        <Controls duel />
        <div className="guide-rules">
          <p>
            <Droplets />
            <span>
              <b>放下泡泡，记得转弯</b>你的泡泡在 2.2
              秒后十字爆炸。钢柱阻挡冲击，爆炸摧毁沿途的第一个彩色方块，也会引爆其他泡泡。圆形钢柱无法炸毁。你也会被自己的泡泡击中，后两关对手的泡泡引爆更快。
            </span>
          </p>
          <p>
            <Diamond />
            <span>
              <b>清空方块，再挑战守卫</b>
              三关有 34、42、50 块方块。清空后守卫登场，给你 3
              秒准备时间；用泡泡炸中它的身体，击败守卫后才会解锁地面的像素地标。
              三关守卫分别有 4、7、12 格生命。
            </span>
          </p>
          <p>
            <ShieldAlert />
            <span>
              <b>看预警，躲重锤与扫射</b>
              橙色叉号是即将受到攻击的地面，紫色是小怪召唤点。后两关的蒸汽喷口也会提前预警。冷却监工召唤
              1 只小怪；钢铁怪兽每次召唤 2
              只，半血后进入狂暴。普通泡泡和钢墙仍然决定你的逃生路线。
            </span>
          </p>
          <p>
            <Zap />
            <span>
              <b>收集补给，提升能力</b>
              粉色晶体增加射程，青色晶体可能增加泡泡数量、移动速度或生命。靠近自动拾取。
            </span>
          </p>
          <p>
            <Trophy />
            <span>
              <b>一起玩，也可以对决</b>双人各有 1
              条生命，最后存活者获胜；同时出局或倒计时结束为平局。单人有 3
              条生命，受击后短暂无敌。按 Esc 暂停。
            </span>
          </p>
        </div>
        <p className="guide-note">
          建筑为首钢园地标的像素化演绎，地图为游戏布局。双人模式需要实体键盘，支持同一台电脑两人对战。开始后自动播放音乐，右上角可分别开关
          BGM 和音效。
        </p>
        <DialogClose className="start-button">
          明白了，进入园区
          <ArrowRight size={18} />
        </DialogClose>
        <div className="source-links">
          地标参考：
          <a
            href="https://www.shougang.com.cn/m1/sgyw/20250616/12948.html"
            target="_blank"
            rel="noreferrer"
          >
            首钢集团
          </a>
          <a
            href="https://www.bjsjs.gov.cn/ywdt/sjsdt/202502/t20250206_476120_sjs.shtml"
            target="_blank"
            rel="noreferrer"
          >
            石景山区政府
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function LandmarkDialog({
  index,
  unlocked,
  onClose,
}: {
  index: number | null;
  unlocked: boolean[];
  onClose: () => void;
}) {
  const l = index === null ? null : LANDMARKS[index];
  return (
    <Dialog open={index !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="game-dialog" showCloseButton={false}>
        <DialogClose className="dialog-x" aria-label="关闭地标">
          <X size={20} />
        </DialogClose>
        <span className="modal-kicker">{l?.english}</span>
        <DialogTitle className="dialog-title">{l?.name}</DialogTitle>
        <DialogDescription className="landmark-description">
          {l?.text}
        </DialogDescription>
        <p
          className={
            index !== null && unlocked[index]
              ? 'landmark-status unlocked'
              : 'landmark-status'
          }
        >
          {index !== null && unlocked[index] ? (
            <Check size={17} />
          ) : (
            <Lock size={17} />
          )}{' '}
          {index !== null && unlocked[index]
            ? '城市记忆已点亮'
            : '清空对应关卡的方块并击败守卫，即可解锁地标。'}
        </p>
        <DialogClose className="secondary-button">返回园区</DialogClose>
      </DialogContent>
    </Dialog>
  );
}
export function GameHUD({
  state,
  onPause,
}: {
  state: any;
  onPause: () => void;
}) {
  const p = state.players[0],
    q = state.players[1];
  const seconds = Math.ceil(state.time);
  return (
    <>
      <div className="match-hud">
        <div className="player-hud">
          <span className="player-token">P1</span>
          <div>
            <b>薄荷 / 泡泡精灵</b>
            <div className="hearts">
              {[0, 1, 2].slice(0, state.mode === 'solo' ? 3 : 1).map((i) => (
                <Heart
                  key={i}
                  size={15}
                  fill={i < p.hp ? 'currentColor' : 'none'}
                  className={i < p.hp ? '' : 'empty-heart'}
                />
              ))}
            </div>
          </div>
        </div>
        <div className={'timer ' + (seconds < 30 ? 'urgent' : '')}>
          <span>
            {state.mode === 'solo'
              ? `区域 0${state.level + 1} · ${LEVELS[state.level].difficulty} / ${LEVELS[state.level].name}`
              : '本地双人 / 泡泡对决'}
          </span>
          <b>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}
            <i>:</i>
            {String(seconds % 60).padStart(2, '0')}
          </b>
        </div>
        <div className="opponent-hud">
          {state.mode === 'duel' ? (
            <>
              <div>
                <b>蜜桃 / 泡泡精灵</b>
                <div className="hearts">
                  <Heart size={15} fill={q.alive ? 'currentColor' : 'none'} />
                </div>
              </div>
              <span className="player-token">P2</span>
            </>
          ) : (
            <div>
              <span>{state.phase === 'clear' ? '巡逻精灵' : '召唤小怪'}</span>
              <b>
                {state.players.filter((p: any) => p.ai && p.alive).length}
                <small>
                  {' '}
                  /{' '}
                  {state.phase === 'clear'
                    ? LEVELS[state.level].enemies
                    : LEVELS[state.level].boss.minionCap}
                </small>
              </b>
            </div>
          )}
          <button
            className="icon-button"
            aria-label="暂停游戏"
            onClick={onPause}
          >
            <Pause size={18} />
          </button>
        </div>
      </div>
      {state.mode === 'solo' && state.boss && state.boss.hp > 0 && (
        <div
          className={'boss-hud ' + (state.boss.phase === 2 ? 'enraged' : '')}
        >
          <div className="boss-heading">
            <span>
              <ShieldAlert size={18} /> {state.boss.name}
            </span>
            <b>
              {state.boss.hp} / {state.boss.maxHP}
            </b>
          </div>
          <progress
            aria-label={`${state.boss.name}生命`}
            value={state.boss.hp}
            max={state.boss.maxHP}
          />
          <span className="boss-tactic">
            {state.phase === 'awakening'
              ? `准备迎战 · ${Math.ceil(state.boss.awake)} 秒`
              : state.warnings.length
                ? `${state.warnings[0].name} · ${Math.max(0.1, state.warnings[0].delay).toFixed(1)} 秒`
                : state.boss.phase === 2
                  ? '狂暴阶段 · 留意十字扫射与召唤点'
                  : '绕开钢墙，用泡泡炸中守卫的身体'}
          </span>
        </div>
      )}
      {state.phase === 'awakening' && (
        <div className="boss-arrival" role="status">
          <span>方块已清空 · 守卫苏醒</span>
          <b>{state.boss.name}</b>
          <small>已返回安全角落，收集补给并准备迎战</small>
        </div>
      )}
      <div className="bottom-hud">
        <div className="mission">
          <span>{state.mode === 'solo' ? '当前目标' : '胜利条件'}</span>
          <b>
            {state.mode === 'solo' ? (
              <>
                {' '}
                <Diamond size={17} />
                {state.landmarkUnlocked
                  ? `${LEVELS[state.level].landmark}已解锁`
                  : state.phase === 'clear'
                    ? `清空${LEVELS[state.level].mapName}的方块`
                    : `击败${LEVELS[state.level].boss.name}`}
              </>
            ) : (
              '存活到最后，赢得对决'
            )}
          </b>
          {state.mode === 'solo' && (
            <div className="block-progress">
              <span>
                剩余方块 <b>{state.remainingBlocks}</b> / {state.initialBlocks}
              </span>
              <progress
                aria-label="方块清理进度"
                value={state.initialBlocks - state.remainingBlocks}
                max={state.initialBlocks || 1}
              />
            </div>
          )}
          {state.mode === 'solo' && (
            <div className="encounter-hint">
              {state.phase === 'clear'
                ? state.level > 0
                  ? '橙色叉号将喷发，提前离开'
                  : '清障后迎战炉芯守卫'
                : '橙色：攻击预警 · 紫色：小怪召唤'}
            </div>
          )}
          <div className="player-stats">
            <span>
              <Droplets size={13} />
              {p.capacity} 颗泡泡
            </span>
            <span>
              <Zap size={13} />
              {p.range} 格射程
            </span>
            <span>{state.score} 分</span>
          </div>
        </div>
        <Controls duel={state.mode === 'duel'} />
      </div>
    </>
  );
}
export function Result({
  state,
  onRetry,
  onNext,
  onHome,
}: {
  state: any;
  onRetry: () => void;
  onNext: () => void;
  onHome: () => void;
}) {
  const r = state.result;
  if (r === 'complete')
    return (
      <CampaignVictory state={state} onRestart={onRetry} onHome={onHome} />
    );
  const win = ['won', 'complete', 'p1', 'p2'].includes(r);
  const title =
    r === 'complete'
      ? '首钢园，重新亮起'
      : r === 'won'
        ? '区域探索完成'
        : r === 'p1'
          ? '薄荷玩家获胜'
          : r === 'p2'
            ? '蜜桃玩家获胜'
            : r === 'draw'
              ? '势均力敌'
              : r === 'timeout'
                ? '探索时间结束'
                : '暂时迷失在钢城';
  return (
    <Dialog open={true}>
      <DialogContent
        className={
          'result-panel ' + (state.landmarkUnlocked ? 'landmark-result' : '')
        }
        showCloseButton={false}
      >
        <div className={'result-symbol ' + (win ? 'win' : '')}>
          {win ? <Trophy size={35} /> : <Droplets size={35} />}
        </div>
        <span className="modal-kicker">
          {win ? 'MISSION COMPLETE' : 'ONE MORE BUBBLE'}
        </span>
        <DialogTitle className="result-title">{title}</DialogTitle>
        <DialogDescription className="result-description">
          {r === 'won'
            ? `${LEVELS[state.level].boss.name}已击败，${LEVELS[state.level].landmark}已点亮。下一关的守卫和地图更加危险。`
            : r === 'complete'
              ? '三处像素地标已全部解锁，脚下是雪飞天的城市记忆。'
              : r === 'draw'
                ? '本局没有唯一胜者，再来一场吧。'
                : win
                  ? '漂亮的泡泡攻势。下一局，交换你的战术。'
                  : '记住：放下泡泡后，转过街角更安全。'}
        </DialogDescription>
        <div className="result-stats">
          <span>
            <b>{state.score}</b>本局得分
          </span>
          <span>
            <b>{state.destroyed}</b>清理障碍
          </span>
          <span>
            <b>
              {state.mode === 'solo'
                ? `${state.remainingBlocks} 块`
                : '本地双人'}
            </b>
            {state.mode === 'solo' ? '剩余方块' : '对战模式'}
          </span>
        </div>
        <button
          autoFocus
          className="start-button"
          onClick={r === 'won' ? onNext : onRetry}
        >
          {r === 'won' ? '前往下一区域' : '再来一局'}
          {r === 'won' ? <ArrowRight size={18} /> : <RotateCcw size={18} />}
        </button>
        <button className="text-button" onClick={onHome}>
          <Home size={15} />
          返回园区
        </button>
      </DialogContent>
    </Dialog>
  );
}
export function CampaignVictory({
  state,
  onRestart,
  onHome,
}: {
  state: any;
  onRestart: () => void;
  onHome: () => void;
}) {
  const totals = state.totals;
  const minutes = Math.floor(totals.elapsed / 60),
    seconds = Math.floor(totals.elapsed % 60);
  return (
    <Dialog open={true}>
      <DialogContent className="victory-panel" showCloseButton={false}>
        <div className="victory-confetti" aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                background: ['#ffd477', '#70e5df', '#f287a3'][i % 3],
                animationDelay: `${-(i % 9) * 0.57}s`,
                animationDuration: `${4 + (i % 3)}s`,
              }}
            />
          ))}
        </div>
        <div className="victory-medal">
          <Trophy size={44} strokeWidth={1.4} />
        </div>
        <span className="victory-kicker">SHOUGANG · ALL CLEAR</span>
        <DialogTitle className="victory-title">全关通关！</DialogTitle>
        <DialogDescription className="victory-description">
          钢铁怪兽已击败，首钢园重新亮起。
          <br />
          这场胜利，属于每一次漂亮的闪避。
        </DialogDescription>
        <div className="victory-landmarks">
          {[Factory, Waves, Mountain].map((Icon, i) => (
            <div key={i}>
              <Icon size={28} strokeWidth={1.5} />
              <b>{LANDMARKS[i].name}</b>
              <span>
                <Check size={12} /> 已解锁
              </span>
            </div>
          ))}
        </div>
        <div className="victory-stats">
          <div>
            <b>{state.score.toLocaleString()}</b>
            <span>本次挑战积分</span>
          </div>
          <div>
            <b>{totals.bosses}</b>
            <span>击败守卫</span>
          </div>
          <div>
            <b>{totals.blocks}</b>
            <span>清理方块</span>
          </div>
          <div>
            <b>
              {minutes}:{String(seconds).padStart(2, '0')}
            </b>
            <span>挑战用时</span>
          </div>
        </div>
        <button
          autoFocus
          className="start-button victory-restart"
          onClick={onRestart}
        >
          重新挑战三关 <RotateCcw size={18} />
        </button>
        <button className="text-button" onClick={onHome}>
          <Home size={16} /> 返回首钢园
        </button>
      </DialogContent>
    </Dialog>
  );
}
export function TouchControls({
  press,
  release,
  bomb,
}: {
  press: (key: string) => void;
  release: (key: string) => void;
  bomb: () => void;
}) {
  return (
    <div className="touch-controls">
      <div className="dpad">
        {[
          ['ArrowUp', ArrowUp, 'up'],
          ['ArrowLeft', ArrowLeft, 'left'],
          ['ArrowDown', ArrowDown, 'down'],
          ['ArrowRight', ArrowRight, 'right'],
        ].map(([code, Icon, cls]: any) => (
          <button
            key={code}
            className={cls}
            aria-label={'移动' + cls}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              press(code);
            }}
            onPointerUp={() => release(code)}
            onPointerCancel={() => release(code)}
            onLostPointerCapture={() => release(code)}
          >
            <Icon size={23} />
          </button>
        ))}
      </div>
      <button
        className="touch-bomb"
        onPointerDown={(e) => {
          e.preventDefault();
          bomb();
        }}
        aria-label="放置泡泡"
      >
        <Droplets size={28} />
        <span>泡泡</span>
      </button>
    </div>
  );
}
