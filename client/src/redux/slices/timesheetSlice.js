
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  draftsByScope: {},
  inlineRowsByScope: {},
};

const getDrafts = (state, scopeKey) => {
  if (!state.draftsByScope[scopeKey]) {
    state.draftsByScope[scopeKey] = [];
  }

  return state.draftsByScope[scopeKey];
};

const getInlineRows = (state, scopeKey) => {
  if (!state.inlineRowsByScope) {
    state.inlineRowsByScope = {};
  }

  if (!state.inlineRowsByScope[scopeKey]) {
    state.inlineRowsByScope[scopeKey] = [];
  }

  return state.inlineRowsByScope[scopeKey];
};

const timesheetSlice = createSlice({
  name: "timesheets",
  initialState,

  reducers: {
    // =====================================
    // EXISTING TIMESHEET DRAFT REDUCERS
    // =====================================

    addTimesheetDraft: (state, action) => {
      const { scopeKey, draft } = action.payload;

      if (!scopeKey || !draft?.clientTimesheetId) return;

      const stack = getDrafts(state, scopeKey);

      const alreadyExists = stack.some(
        (item) => item.clientTimesheetId === draft.clientTimesheetId
      );

      if (!alreadyExists) {
        stack.push(draft);
      }
    },

    updateTimesheetDraft: (state, action) => {
      const { scopeKey, clientTimesheetId, updates } = action.payload;

      if (!scopeKey || !clientTimesheetId) return;

      const stack = getDrafts(state, scopeKey);

      const index = stack.findIndex(
        (item) => item.clientTimesheetId === clientTimesheetId
      );

      if (index !== -1) {
        stack[index] = {
          ...stack[index],
          ...updates,
        };
      }
    },

    removeTimesheetDraft: (state, action) => {
      const { scopeKey, clientTimesheetId } = action.payload;

      if (!scopeKey || !clientTimesheetId) return;

      const stack = getDrafts(state, scopeKey);

      state.draftsByScope[scopeKey] = stack.filter(
        (item) => item.clientTimesheetId !== clientTimesheetId
      );
    },

    removeSavedTimesheetDrafts: (state, action) => {
      const { scopeKey, clientTimesheetIds } = action.payload;

      if (!scopeKey || !Array.isArray(clientTimesheetIds)) return;

      const savedIds = new Set(clientTimesheetIds);

      const stack = getDrafts(state, scopeKey);

      state.draftsByScope[scopeKey] = stack.filter(
        (item) => !savedIds.has(item.clientTimesheetId)
      );
    },

    // =====================================
    // NEW INLINE ROW REDUCERS
    // =====================================

    addInlineRowDraft: (state, action) => {
      const { scopeKey, row } = action.payload;

      if (!scopeKey || !row?.id) return;

      const rows = getInlineRows(state, scopeKey);

      const alreadyExists = rows.some(
        (item) => item.id === row.id
      );

      if (!alreadyExists) {
        rows.push(row);
      }
    },

    updateInlineRowDraft: (state, action) => {
      const { scopeKey, rowId, updates } = action.payload;

      if (!scopeKey || !rowId || !updates) return;

      const rows = getInlineRows(state, scopeKey);

      const index = rows.findIndex(
        (item) => item.id === rowId
      );

      if (index !== -1) {
        rows[index] = {
          ...rows[index],
          ...updates,
        };
      }
    },

    removeInlineRowDraft: (state, action) => {
      const { scopeKey, rowId } = action.payload;

      if (!scopeKey || !rowId) return;

      const rows = getInlineRows(state, scopeKey);

      state.inlineRowsByScope[scopeKey] = rows.filter(
        (item) => item.id !== rowId
      );
    },

    removeAllInlineRows: (state, action) => {
      const { scopeKey } = action.payload;

      if (!scopeKey) return;

      state.inlineRowsByScope[scopeKey] = [];
    },
  },
});

// =====================================
// ACTION EXPORTS
// =====================================

export const {
  // Existing actions
  addTimesheetDraft,
  updateTimesheetDraft,
  removeTimesheetDraft,
  removeSavedTimesheetDrafts,

  // New inline row actions
  addInlineRowDraft,
  updateInlineRowDraft,
  removeInlineRowDraft,
  removeAllInlineRows,
} = timesheetSlice.actions;

// =====================================
// EXISTING SELECTORS
// =====================================

export const selectTimesheetDrafts = (state, scopeKey) =>
  state.timesheets.draftsByScope?.[scopeKey] || [];

export const selectCompletedTimesheetDrafts = (state, scopeKey) =>
  selectTimesheetDrafts(state, scopeKey).filter(
    (item) => item.taskStatus === "Completed"
  );

// =====================================
// NEW INLINE ROW SELECTOR
// =====================================

export const selectInlineRows = (state, scopeKey) =>
  state.timesheets?.inlineRowsByScope?.[scopeKey] || [];

export default timesheetSlice.reducer;
