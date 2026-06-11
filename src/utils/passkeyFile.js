import { idbStore } from './db';

export const buildPasskeyFileContent = (passkeyObj) => {
    return JSON.stringify(passkeyObj, null, 2);
};

export const parsePasskeyFile = (rawText) => {
    const text = String(rawText || '').replace(/^\uFEFF/, '').trim();
    if (!text) {
        throw new Error('Passkey file is empty. Use the .json file downloaded during registration (check your Downloads folder).');
    }

    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('Passkey file is not valid JSON. Re-register to download a new passkey file.');
    }

    const passkey = parsed?.passkey && typeof parsed.passkey === 'object'
        ? parsed.passkey
        : parsed;

    if (!passkey || typeof passkey !== 'object') {
        throw new Error('Passkey file has an invalid structure.');
    }

    return passkey;
};

export const isValidPasskeyStructure = (passkey) => {
    if (!passkey?.name || !passkey?.token) return false;
    const hasProof = Boolean(passkey.deviceId && passkey.proof);
    const hasSignature = Boolean(passkey.devicePublicKey && passkey.signature);
    return hasProof || hasSignature;
};

export const downloadPasskeyFile = (passkeyObj) => {
    const fileContent = buildPasskeyFileContent(passkeyObj);
    const blob = new Blob([fileContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passkey_${passkeyObj.name.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const backupPasskeyLocally = async (passkeyObj) => {
    await idbStore.set('sms_passkey_backup', passkeyObj);
};

export const readPasskeyBackup = async () => {
    return idbStore.get('sms_passkey_backup');
};

/** Save passkey: always downloads + optional save-as picker. Writes JSON string (not Blob) for Windows compatibility. */
export const savePasskeyFile = async (passkeyObj, { showToast } = {}) => {
    if (!passkeyObj?.name || !passkeyObj?.token) {
        console.error('Invalid passkey object:', passkeyObj);
        return false;
    }
    if (!passkeyObj.proof && !(passkeyObj.devicePublicKey && passkeyObj.signature)) {
        console.error('Passkey missing verification fields:', passkeyObj);
        return false;
    }

    const fileContent = buildPasskeyFileContent(passkeyObj);
    if (!fileContent || fileContent.length < 10) {
        console.error('Passkey file content too short');
        return false;
    }

    let pickerSaved = false;

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: `passkey_${passkeyObj.name.toLowerCase().replace(/\s+/g, '_')}.json`,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(fileContent);
            await writable.close();
            pickerSaved = true;
        } catch (err) {
            if (err.name === 'AbortError') {
                showToast?.('Save location cancelled. Passkey will be downloaded instead.', 'warning');
            } else {
                console.error('File System Access API failed:', err);
            }
        }
    }

    downloadPasskeyFile(passkeyObj);
    await backupPasskeyLocally(passkeyObj);

    return pickerSaved || true;
};

export const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file selected.'));
            return;
        }
        if (file.size === 0) {
            reject(new Error('Selected file is empty (0 bytes). Use the passkey .json from your Downloads folder.'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result;
            if (!text || !String(text).trim()) {
                reject(new Error('Could not read passkey file contents. Try the copy in your Downloads folder.'));
                return;
            }
            resolve(String(text));
        };
        reader.onerror = () => reject(new Error('Failed to read the passkey file.'));
        reader.readAsText(file);
    });
};
