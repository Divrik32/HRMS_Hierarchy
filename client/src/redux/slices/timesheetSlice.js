
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
    // TIMESHEET DRAFT REDUCERS
    // =====================================

    addTimesheetDraft: (state, action) => {
      const { scopeKey, draft } = action.payload;

      if (!scopeKey || !draft?.clientTimesheetId) return;

      const stack = getDrafts(state, scopeKey);

      const index = stack.findIndex(
        (item) =>
          item.clientTimesheetId === draft.clientTimesheetId
      );

      if (index === -1) {
        stack.push(draft);
      } else {
        stack[index] = {
          ...stack[index],
          ...draft,
        };
      }
    },

    updateTimesheetDraft: (state, action) => {
      const { scopeKey, clientTimesheetId, updates } =
        action.payload;

      if (!scopeKey || !clientTimesheetId || !updates) return;

      const stack = getDrafts(state, scopeKey);

      const index = stack.findIndex(
        (item) =>
          item.clientTimesheetId === clientTimesheetId
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

      state.draftsByScope[scopeKey] = getDrafts(
        state,
        scopeKey
      ).filter(
        (item) =>
          item.clientTimesheetId !== clientTimesheetId
      );
    },

    removeSavedTimesheetDrafts: (state, action) => {
      const { scopeKey, clientTimesheetIds } = action.payload;

      if (!scopeKey || !Array.isArray(clientTimesheetIds)) return;

      const savedIds = new Set(clientTimesheetIds);

      state.draftsByScope[scopeKey] = getDrafts(
        state,
        scopeKey
      ).filter(
        (item) =>
          !savedIds.has(item.clientTimesheetId)
      );
    },

    // =====================================
    // INLINE ROW REDUCERS
    // =====================================

    addInlineRowDraft: (state, action) => {
      const { scopeKey, row } = action.payload;

      if (!scopeKey || !row?.id) return;

      const rows = getInlineRows(state, scopeKey);

      const index = rows.findIndex(
        (item) => item.id === row.id
      );

      if (index === -1) {
        rows.push(row);
      } else {
        rows[index] = {
          ...rows[index],
          ...row,
        };
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

      state.inlineRowsByScope[scopeKey] = getInlineRows(
        state,
        scopeKey
      ).filter((item) => item.id !== rowId);
    },

    removeAllInlineRows: (state, action) => {
      const { scopeKey } = action.payload;

      if (!scopeKey) return;

      state.inlineRowsByScope[scopeKey] = [];
    },

    // =====================================
    // REMOVE SAVED INLINE ROWS
    // =====================================

    removeSavedInlineRows: (state, action) => {
      const { scopeKey, rowIds } = action.payload;

      if (!scopeKey || !Array.isArray(rowIds)) return;

      const savedIds = new Set(rowIds);

      state.inlineRowsByScope[scopeKey] = getInlineRows(
        state,
        scopeKey
      ).filter((row) => !savedIds.has(row.id));
    },

    // =====================================
    // REMOVE SAVED DATA FROM BOTH STORES
    // =====================================

    removeSavedCompletedTimesheets: (state, action) => {
      const {
        scopeKey,
        clientTimesheetIds = [],
        inlineRowIds = [],
      } = action.payload;

      if (!scopeKey) return;

      const savedDraftIds = new Set(clientTimesheetIds);
      const savedInlineIds = new Set(inlineRowIds);

      state.draftsByScope[scopeKey] = getDrafts(
        state,
        scopeKey
      ).filter(
        (draft) =>
          !savedDraftIds.has(draft.clientTimesheetId)
      );

      state.inlineRowsByScope[scopeKey] = getInlineRows(
        state,
        scopeKey
      ).filter(
        (row) => !savedInlineIds.has(row.id)
      );
    },
  },
});

// =====================================
// ACTION EXPORTS
// =====================================

export const {
  addTimesheetDraft,
  updateTimesheetDraft,
  removeTimesheetDraft,
  removeSavedTimesheetDrafts,

  addInlineRowDraft,
  updateInlineRowDraft,
  removeInlineRowDraft,
  removeAllInlineRows,
  removeSavedInlineRows,

  removeSavedCompletedTimesheets,
} = timesheetSlice.actions;

// =====================================
// SELECTORS
// =====================================

export const selectTimesheetDrafts = (state, scopeKey) =>
  state.timesheets?.draftsByScope?.[scopeKey] || [];

export const selectCompletedTimesheetDrafts = (
  state,
  scopeKey
) =>
  selectTimesheetDrafts(state, scopeKey).filter(
    (item) => item.taskStatus === "Completed"
  );

export const selectInlineRows = (state, scopeKey) =>
  state.timesheets?.inlineRowsByScope?.[scopeKey] || [];

export const selectCompletedInlineRows = (
  state,
  scopeKey
) =>
  selectInlineRows(state, scopeKey).filter(
    (item) =>
      item.taskStatus === "Completed" ||
      item.status === "Completed"
  );

// =====================================
// COMBINED COMPLETED SELECTOR
// =====================================

export const selectAllCompletedTimesheetData = (
  state,
  scopeKey
) => ({
  drafts: selectCompletedTimesheetDrafts(state, scopeKey),
  inlineRows: selectCompletedInlineRows(state, scopeKey),
});

export default timesheetSlice.reducer;
