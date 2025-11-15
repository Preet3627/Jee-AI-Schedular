declare global {
  interface Window {
    gapi: any;
  }
}

const FILENAME = 'jee-scheduler-pro-data.json';
const FOLDER = 'appDataFolder';

const findOrCreateFile = async (): Promise<string> => {
    const response = await window.gapi.client.drive.files.list({
        spaces: FOLDER,
        fields: 'files(id, name)',
        q: `name='${FILENAME}' and trashed = false`,
    });

    if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
    }

    const fileMetadata = {
        name: FILENAME,
        parents: [FOLDER]
    };

    const createResponse = await window.gapi.client.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });
    
    return createResponse.result.id;
};

export const uploadData = async (content: string, existingFileId?: string | null): Promise<string> => {
    const fileId = existingFileId || await findOrCreateFile();
    
    const request = window.gapi.client.request({
        path: `/upload/drive/v3/files/${fileId}`,
        method: 'PATCH',
        params: { uploadType: 'media' },
        headers: {
            'Content-Type': 'application/json'
        },
        body: content
    });
    
    await request;
    return fileId;
};


export const downloadData = async (fileId: string): Promise<string> => {
    const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });

    return response.body;
};
