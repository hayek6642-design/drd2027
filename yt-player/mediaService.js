const STORAGE_KEY = 'yt_media_items_v1';

const readItems = () => {
  try {    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const writeItems = (arr) => { try {    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch {} };
const getMediaItems = async () => readItems();
const addMediaItem = async (media) => { const items = readItems(); items.push(media); writeItems(items); return media; };
const deleteMediaItem = async (id) => { const items = readItems().filter(i => i.id !== id); writeItems(items); return true; };

export const fetchActiveMedia = async () => {
  const items = await getMediaItems();
  const now = new Date();
  return items.filter(item => {
    const start = new Date(item.startTime);
    const end = new Date(item.endTime);
    return now >= start && now <= end;
  });
};

export const createMediaItem = async (media) => {
  return await addMediaItem(media);
};

export const removeMediaItem = async (id) => {
  return await deleteMediaItem(id);
};
