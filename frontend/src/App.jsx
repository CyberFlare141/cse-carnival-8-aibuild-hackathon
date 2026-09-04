import React, { useState } from 'react';
import { useData } from './context/DataContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { RecordModal } from './components/RecordModal';
import { ActionModal } from './components/ActionModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/Toast';

import { ScheduleView } from './views/ScheduleView';
import { RoomsView } from './views/RoomsView';
import { EventsView } from './views/EventsView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { AssignmentsView } from './views/AssignmentsView';
import { ChatView } from './views/ChatView';

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

  const [currentTab, setCurrentTab] = useState('schedule');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

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

        {/* Active View Component */}
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
