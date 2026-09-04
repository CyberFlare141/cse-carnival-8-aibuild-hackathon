import React, { useState, useEffect, useCallback } from 'react';
import { useData } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { RecordModal } from './components/RecordModal';
import { ActionModal } from './components/ActionModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/Toast';

import { LandingPage } from './views/LandingPage';
import { ScheduleView } from './views/ScheduleView';
import { RoomsView } from './views/RoomsView';
import { EventsView } from './views/EventsView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { AssignmentsView } from './views/AssignmentsView';
import { ChatView } from './views/ChatView';

function getInitialRoute() {
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path.startsWith('/app') || path.startsWith('/dashboard') || hash === '#app' || hash === '#dashboard') {
    return 'app';
  }
  return 'landing';
}

export function AppContent() {
  const {
    isBackendOnline,
    fetchAll,
    addRecord,
    editRecord,
    deleteRecord,
    bookRoom,
    registerEvent,
  } = useData();

  const [currentView, setCurrentView] = useState(getInitialRoute);
  const [currentTab, setCurrentTab] = useState('schedule');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = getInitialRoute();
      setCurrentView(route);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigation handlers
  const handleOpenApp = useCallback((targetTab) => {
    if (targetTab && typeof targetTab === 'string') {
      setCurrentTab(targetTab);
    }
    setCurrentView('app');
    if (window.location.pathname !== '/app') {
      window.history.pushState(null, '', '/app');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleGoToLanding = useCallback(() => {
    setCurrentView('landing');
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Modals state
  const [recordModal, setRecordModal] = useState({
    isOpen: false,
    mode: 'add',
    section: 'schedule',
    initialData: null,
  });

  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null,
    targetItem: null,
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // --- Handlers ---
  const handleOpenAddModal = (sectionOverride) => {
    const sec = sectionOverride || currentTab;
    if (sec === 'chat') return;
    setRecordModal({
      isOpen: true,
      mode: 'add',
      section: sec,
      initialData: null,
    });
  };

  const handleOpenEditModal = (section, item) => {
    setRecordModal({
      isOpen: true,
      mode: 'edit',
      section,
      initialData: item,
    });
  };

  const handleSaveRecord = async (payload) => {
    if (recordModal.mode === 'add') {
      await addRecord(recordModal.section, payload);
    } else {
      await editRecord(recordModal.section, recordModal.initialData.id, payload);
    }
  };

  const handleDeletePrompt = (section, item) => {
    const label =
      item.name ||
      item.title ||
      item.course ||
      item.roomNumber ||
      item.id;

    setConfirmDialog({
      isOpen: true,
      title: `Delete from ${section.charAt(0).toUpperCase() + section.slice(1)}?`,
      message: `Are you sure you want to delete "${label}" from the campus registry? This will permanently remove the record on the server.`,
      onConfirm: async () => {
        try {
          await deleteRecord(section, item.id);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const handleOpenBookModal = (room) => {
    setActionModal({
      isOpen: true,
      type: 'book-room',
      targetItem: room,
    });
  };

  const handleOpenRegisterModal = (event) => {
    setActionModal({
      isOpen: true,
      type: 'register-event',
      targetItem: event,
    });
  };

  const handleConfirmAction = async (payload) => {
    if (actionModal.type === 'book-room') {
      await bookRoom(actionModal.targetItem.id, payload);
    } else if (actionModal.type === 'register-event') {
      await registerEvent(actionModal.targetItem.id, payload.name);
    }
  };

  // If in Public Landing Page mode, render LandingPage
  if (currentView === 'landing') {
    return (
      <div className="landing-shell">
        <Sidebar
          currentTab="home"
          onSelectTab={handleOpenApp}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onGoToLanding={handleGoToLanding}
          showLandingLink={false}
        />
        {isMobileMenuOpen && (
          <button
            type="button"
            className="mobile-nav-scrim landing-nav-scrim"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />
        )}
        <div className="landing-root">
          <LandingPage
            onOpenApp={handleOpenApp}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
          />
        </div>
        <ToastContainer />
      </div>
    );
  }

  // Otherwise, render full Dashboard application workspace
  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onGoToLanding={handleGoToLanding}
      />

      {isMobileMenuOpen && (
        <button
          type="button"
          className="mobile-nav-scrim"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {/* Offline notification banner if backend is unreachable */}
        {isBackendOnline === false && (
          <div className="offline-banner">
            <div>
              <strong>⚠️ REGISTRY DISCONNECTED:</strong> Unable to connect to the CampusOS FastAPI backend.
              Ensure the configured API service is running.
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchAll()}
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              ⚡ Retry Connection
            </button>
          </div>
        )}

        {/* View Header */}
        <Header
          currentTab={currentTab}
          onOpenAddModal={() => handleOpenAddModal(currentTab)}
          onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        />

        {/* Active View Component — keyed so CSS entrance fires on tab switch */}
        <div key={currentTab} className="tab-content-enter">
          {currentTab === 'schedule' && (
            <ScheduleView
              onEditItem={(item) => handleOpenEditModal('schedule', item)}
              onDeleteItem={(item) => handleDeletePrompt('schedule', item)}
              onAddNew={() => handleOpenAddModal('schedule')}
            />
          )}

          {currentTab === 'rooms' && (
            <RoomsView
              onEditItem={(item) => handleOpenEditModal('rooms', item)}
              onDeleteItem={(item) => handleDeletePrompt('rooms', item)}
              onAddNew={() => handleOpenAddModal('rooms')}
              onOpenBookModal={handleOpenBookModal}
            />
          )}

          {currentTab === 'events' && (
            <EventsView
              onEditItem={(item) => handleOpenEditModal('events', item)}
              onDeleteItem={(item) => handleDeletePrompt('events', item)}
              onAddNew={() => handleOpenAddModal('events')}
              onOpenRegisterModal={handleOpenRegisterModal}
            />
          )}

          {currentTab === 'announcements' && (
            <AnnouncementsView
              onEditItem={(item) => handleOpenEditModal('announcements', item)}
              onDeleteItem={(item) => handleDeletePrompt('announcements', item)}
              onAddNew={() => handleOpenAddModal('announcements')}
            />
          )}

          {currentTab === 'assignments' && (
            <AssignmentsView
              onEditItem={(item) => handleOpenEditModal('assignments', item)}
              onDeleteItem={(item) => handleDeletePrompt('assignments', item)}
              onAddNew={() => handleOpenAddModal('assignments')}
            />
          )}

          {currentTab === 'chat' && <ChatView />}
        </div>

      </main>

      {/* Generic Add / Edit Record Modal */}
      <RecordModal
        isOpen={recordModal.isOpen}
        mode={recordModal.mode}
        section={recordModal.section}
        initialData={recordModal.initialData}
        onClose={() => setRecordModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleSaveRecord}
      />

      {/* Action Modal (Book Room / Register Event) */}
      <ActionModal
        isOpen={actionModal.isOpen}
        type={actionModal.type}
        targetItem={actionModal.targetItem}
        onClose={() => setActionModal({ isOpen: false, type: null, targetItem: null })}
        onConfirm={handleConfirmAction}
      />

      {/* Deletion Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
