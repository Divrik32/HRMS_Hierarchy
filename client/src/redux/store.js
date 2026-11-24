
import { configureStore, combineReducers } from "@reduxjs/toolkit";

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";

import storageImport from "redux-persist/lib/storage";

import timesheetReducer from "./slices/timesheetSlice";

// Normalize storage export for Vite module compatibility
const storage = storageImport?.default || storageImport;

console.log("Redux Persist Storage:", storage);
console.log("Storage getItem:", typeof storage?.getItem);
console.log("Storage setItem:", typeof storage?.setItem);

const rootReducer = combineReducers({
  timesheets: timesheetReducer,
});

const persistConfig = {
  key: "hrms-root",
  version: 1,
  storage,
  whitelist: ["timesheets"],
};

const persistedReducer = persistReducer(
  persistConfig,
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,

  devTools: false,

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
        ],
      },
    }),
});

export const persistor = persistStore(store);
