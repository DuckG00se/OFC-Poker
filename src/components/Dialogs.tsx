import React from 'react';
import { personaFor } from '../ai';
import type { Card, HandScore } from '../engine';
import { ACHIEVEMENTS } from '../state/achievements';
import type { HandRecord } from '../state/stats';
import type { GameApi } from '../state/useGame';
import type { InstallPrompt } from '../ui/useInstallPrompt';
import CardTracker from './CardTracker';
import MenuModal, { type MenuChoice } from './MenuModal';
import Modal from './Modal';
import ProfileModal, { type ProfileTab } from './ProfileModal';
import ReplayView from './ReplayView';
import ResultDetails from './ResultDetails';
import RulesModal from './RulesModal';
import SettingsModal from './SettingsModal';

export type Dialog =
  | { kind: 'menu' }
  | { kind: 'settings' }
  | { kind: 'tracker' }
  | { kind: 'details' }
  | { kind: 'rules' }
  | { kind: 'profile'; tab: ProfileTab }
  | { kind: 'replay'; record: HandRecord }
  | null;

interface DialogsProps {
  dialog: Dialog;
  setDialog: (dialog: Dialog) => void;
  api: GameApi;
  /** Cards the player cannot see (for the tracker). */
  unseen: readonly Card[];
  result: HandScore | null;
  install: InstallPrompt;
  onStartTutorial: () => void;
}

/** Every dialog the table can open, in one place. */
const Dialogs: React.FC<DialogsProps> = ({ dialog, setDialog, api, unseen, result, install, onStartTutorial }) => {
  if (!dialog) return null;
  const close = (): void => setDialog(null);
  const config = api.game.setup?.config ?? api.session.config;

  switch (dialog.kind) {
    case 'menu': {
      const choose = (choice: MenuChoice): void => {
        if (choice === 'tutorial') {
          onStartTutorial();
          close();
        } else if (choice === 'install') {
          install.install();
          close();
        } else if (choice === 'rules' || choice === 'settings') {
          setDialog({ kind: choice });
        } else {
          setDialog({ kind: 'profile', tab: choice });
        }
      };
      return (
        <MenuModal
          canInstall={install.canInstall}
          unlockedCount={Object.keys(api.achievements).length}
          totalAchievements={ACHIEVEMENTS.length}
          handsInHistory={api.history.length}
          onChoose={choose}
          onClose={close}
        />
      );
    }
    case 'settings':
      return (
        <SettingsModal
          config={api.session.config}
          locked={api.game.phase === 'placing'}
          onConfig={api.setConfig}
          onNewSession={api.newSession}
          onResetAll={api.resetAll}
          onClose={close}
        />
      );
    case 'tracker':
      return (
        <Modal title="Cards remaining" onClose={close}>
          <CardTracker unseen={unseen} />
        </Modal>
      );
    case 'details':
      return result ? (
        <Modal title="Hand result" onClose={close}>
          <ResultDetails result={result} cpuName={personaFor(config.difficulty).name} stake={config.stake} />
        </Modal>
      ) : null;
    case 'rules':
      return (
        <RulesModal
          onClose={close}
          onStartTutorial={() => {
            onStartTutorial();
            close();
          }}
        />
      );
    case 'profile':
      return (
        <ProfileModal
          tab={dialog.tab}
          stats={api.stats}
          achievements={api.achievements}
          history={api.history}
          onReplay={(record) => setDialog({ kind: 'replay', record })}
          onClose={close}
        />
      );
    case 'replay':
      return (
        <ReplayView
          record={dialog.record}
          cpuName={personaFor(dialog.record.difficulty).name}
          onClose={() => setDialog({ kind: 'profile', tab: 'history' })}
        />
      );
  }
};

export default Dialogs;
