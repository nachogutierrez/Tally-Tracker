import { h, createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import htm from 'htm';
import * as Google from './google.js';
import { ConflictError } from './google.js';
import { useAuth } from './auth.js';

const html = htm.bind(h);
const ApiContext = createContext();

export function ApiProvider({ children }) {
  const { isGapiReady, user } = useAuth();
  const [data, setData] = useState({ cats: {}, logs: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const freshData = await Google.loadDataFromDrive();
        if (freshData) {
          setData(freshData);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    if (isGapiReady && user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isGapiReady, user]);

  const withMutationRetry = async (mutationLogic) => {
    const maxRetries = 3;
    const previousState = JSON.parse(JSON.stringify(data));

    for (let i = 0; i < maxRetries; i++) {
      try {
        const newState = mutationLogic(JSON.parse(JSON.stringify(data)));
        await Google.saveStateToDrive(newState);
        setData(newState);
        // You can add your toast/undo logic here
        return;
      } catch (error) {
        if (error instanceof ConflictError) {
          console.warn(`Conflict detected. Retrying...`);
          const freshState = await Google.loadDataFromDrive();
          if (freshState) {
            setData(freshState);
          } else {
            alert("Failed to reload data from Drive after a conflict. Aborting.");
            return;
          }
        } else {
          console.error("An unexpected error occurred:", error);
          alert("An unexpected error occurred.");
          return;
        }
      }
    }
    alert("Failed to save changes after multiple attempts.");
  };
  
  const generateShortId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  const api = {
    addCategory: async (name, goal) => {
      await withMutationRetry(state => {
        const newId = generateShortId();
        if (!state.cats) state.cats = {};
        state.cats[newId] = { n: name, g: goal };
        return state;
      });
    },
    editCategory: async (id, newName) => {
        await withMutationRetry(state => {
          if (state.cats[id]) {
            state.cats[id].n = newName;
          }
          return state;
        });
    },
    deleteCategory: async (id) => {
        await withMutationRetry(state => {
            if (state.cats[id]) {
              state.logs = (state.logs || []).filter(log => log[2] !== id);
              delete state.cats[id];
            }
            return state;
        });
    },
    addLog: async (catId, delta, timestamp, note) => {
        await withMutationRetry(state => {
            const getNextLogId = () => (state.logs || []).reduce((maxId, log) => Math.max(log[0], maxId), 0) + 1;
            const newLog = [getNextLogId(), timestamp, catId, delta];
            if (note) newLog.push(note);
            if (!state.logs) state.logs = [];
            state.logs.push(newLog);
            return state;
        });
    },
    editLog: async (id, newDelta, newNote) => {
        await withMutationRetry(state => {
            const logIndex = (state.logs || []).findIndex(log => log[0] === id);
            if (logIndex > -1) {
                state.logs[logIndex][3] = newDelta;
                const noteIndex = 4;
                if (newNote) {
                    state.logs[logIndex][noteIndex] = newNote;
                } else if (state.logs[logIndex].length > noteIndex) {
                    state.logs[logIndex].splice(noteIndex, 1);
                }
            }
            return state;
        });
    },
    deleteLog: async (id) => {
        await withMutationRetry(state => {
            state.logs = (state.logs || []).filter(log => log[0] !== id);
            return state;
        });
    }
  };

  const value = { data, loading, error, ...api };

  return html`
    <${ApiContext.Provider} value=${value}>
      ${children}
    <//>
  `;
}

export function useApi() {
  return useContext(ApiContext);
}