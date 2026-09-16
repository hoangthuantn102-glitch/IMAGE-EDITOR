import { useState, useCallback } from 'react';

type StateWithHistory<T> = {
  past: T[];
  present: T;
  future: T[];
};

export const useUndoRedo = <T>(initialState: T) => {
  const [state, setInternalState] = useState<StateWithHistory<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const previous = state.past[state.past.length - 1];
    const newPast = state.past.slice(0, state.past.length - 1);
    setInternalState({
      past: newPast,
      present: previous,
      future: [state.present, ...state.future],
    });
  }, [canUndo, state]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    setInternalState({
      past: [...state.past, state.present],
      present: next,
      future: newFuture,
    });
  }, [canRedo, state]);

  const setState = useCallback((newState: T) => {
    // Check for equality might be tricky with arrays/objects, but good for primitives
    if (newState === state.present) return;
    
    // If the new state is actually the previous state (like after a generation),
    // we just want to pop from past instead of adding a duplicate.
    // For simplicity, we'll always add for now.
    setInternalState({
      past: [...state.past, state.present],
      present: newState,
      future: [], // Clear future on new state
    });
  }, [state.present, state.past]);
  
  const resetState = useCallback((newState: T) => {
      setInternalState({
          past: [],
          present: newState,
          future: []
      })
  }, [])

  return { 
    state: state.present, 
    setState,
    resetState,
    undo, 
    redo, 
    canUndo, 
    canRedo 
  };
};
