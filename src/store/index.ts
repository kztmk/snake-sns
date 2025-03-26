import { combineReducers, configureStore } from '@reduxjs/toolkit';
import auth from './reducers/authSlice';

const rootReducer = combineReducers({ auth });
export type RootState = ReturnType<typeof rootReducer>;

const store = configureStore({
  reducer: rootReducer,
});

export type AppDispatch = typeof store.dispatch;
export default store;
