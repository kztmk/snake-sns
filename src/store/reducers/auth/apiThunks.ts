// src/store/reducers/auth/apiThunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import { ref as dbRef, set as setRTDB } from 'firebase/database';
import { database } from '@/firebase';
import { RootState } from '../../index';
import { SLICE_NAME } from './constants';
import { AffiliateKeyData, ApiKeyData } from './types';

/**
 * API Keyを保存する
 */
export const saveApiKeys = createAsyncThunk<ApiKeyData, ApiKeyData, { state: RootState }>(
  `${SLICE_NAME}/saveApiKeys`,
  async (args, thunkApi) => {
    try {
      const appUser = thunkApi.getState().auth.user;
      if (appUser !== null && appUser.uid !== null) {
        const settingsRef = dbRef(database, `user-data/${appUser.uid}/settings`);
        await setRTDB(settingsRef, {
          chatGptApiKey: args.chatGptApiKey,
          geminiApiKey: args.geminiApiKey,
          anthropicApiKey: args.anthropicApiKey,
          googleSheetUrl: args.googleSheetUrl,
        });
        return {
          chatGptApiKey: args.chatGptApiKey,
          geminiApiKey: args.geminiApiKey,
          anthropicApiKey: args.anthropicApiKey,
          googleSheetUrl: args.googleSheetUrl,
        };
      }
      return { chatGptApiKey: '', geminiApiKey: '', anthropicApiKey: '', googleSheetUrl: '' };
    } catch (error: any) {
      return thunkApi.rejectWithValue(error.message);
    }
  }
);

/**
 * アフィリエイトキーを保存する
 */
export const affiliateKeySave = createAsyncThunk<
  AffiliateKeyData,
  { keyInfo: [string, string][] },
  { state: RootState; rejectValue: string }
>(`${SLICE_NAME}/affiliateKeySave`, async (args, thunkApi) => {
  try {
    const appUser = thunkApi.getState().auth.user;
    if (appUser && appUser.uid) {
      const newValues = Object.fromEntries(args.keyInfo);
      const settingsRef = dbRef(database, `user-data/${appUser.uid}/settings`);
      console.log('newValues', newValues);
      const userSettings = {
        rakutenAppId: appUser.rakutenAppId ?? '',
        amazonAccessKey: appUser.amazonAccessKey ?? '',
        amazonSecretKey: appUser.amazonSecretKey ?? '',
        dmmAffiliateId: appUser.dmmAffiliateId ?? '',
        dmmApiId: appUser.dmmApiId ?? '',
        chatGptApiKey: appUser.chatGptApiKey,
        geminiApiKey: appUser.geminiApiKey,
        anthropicApiKey: appUser.anthropicApiKey,
        googleSheetUrl: appUser.googleSheetUrl ?? '',
        ...newValues,
      };
      await setRTDB(settingsRef, userSettings);
      return {
        rakutenAppId: userSettings.rakutenAppId ?? '',
        amazonAccessKey: userSettings.amazonAccessKey ?? '',
        amazonSecretKey: userSettings.amazonSecretKey ?? '',
        dmmAffiliateId: userSettings.dmmAffiliateId ?? '',
        dmmApiId: userSettings.dmmApiId ?? '',
        googleSheetUrl: userSettings.googleSheetUrl ?? '',
      };
    }
    return {
      rakutenAppId: '',
      amazonAccessKey: '',
      amazonSecretKey: '',
      dmmAffiliateId: '',
      dmmApiId: '',
      googleSheetUrl: '',
    };
  } catch (error: any) {
    return thunkApi.rejectWithValue(error.message);
  }
});
