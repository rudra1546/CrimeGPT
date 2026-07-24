import api from './api';
import { getMutations, deleteMutation } from './IndexedDBStore';

let isSyncing = false;

export const syncPendingMutations = async (onStatusChange = null) => {
  if (isSyncing || !navigator.onLine) return;
  isSyncing = true;
  if (onStatusChange) onStatusChange('syncing');

  try {
    const mutations = await getMutations();
    // Sort by timestamp asc to maintain operation order
    mutations.sort((a, b) => a.timestamp - b.timestamp);

    for (const m of mutations) {
      try {
        let response = null;
        switch (m.action) {
          case 'create_case':
            response = await api.post('/cases/', m.payload);
            break;
          case 'create_witness':
            response = await api.post('/witnesses/', m.payload);
            break;
          case 'create_suspect':
            response = await api.post('/suspects/', m.payload);
            break;
          case 'create_task':
            response = await api.post('/tasks/', m.payload);
            break;
          case 'update_witness':
            response = await api.put(`/witnesses/${m.payload.id}`, m.payload.data);
            break;
          case 'update_suspect':
            response = await api.put(`/suspects/${m.payload.id}`, m.payload.data);
            break;
          case 'update_task':
            response = await api.put(`/tasks/${m.payload.id}`, m.payload.data);
            break;
          case 'create_timeline':
            response = await api.post(`/cases/${m.payload.case_id}/timeline`, m.payload.data);
            break;
          case 'create_evidence_movement':
            response = await api.post(`/cases/evidence/${m.payload.evidence_id}/movement`, m.payload.data);
            break;
          default:
            console.warn('Unknown mutation action queued:', m.action);
        }
        
        // If successfully replayed, remove from local queue
        await deleteMutation(m.id);
      } catch (err) {
        console.error('Failed syncing offline operation, pausing queue replay:', err);
        // Pause replay if a request fails, to maintain consistency
        break;
      }
    }
    
    if (onStatusChange) onStatusChange('online');
  } catch (err) {
    console.error('Error in synchronization worker:', err);
  } finally {
    isSyncing = false;
  }
};

export const registerSyncListeners = (onStatusChange) => {
  const handleOnline = () => {
    syncPendingMutations(onStatusChange);
  };
  
  const handleOffline = () => {
    if (onStatusChange) onStatusChange('offline');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Run initial sync check
  syncPendingMutations(onStatusChange);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
