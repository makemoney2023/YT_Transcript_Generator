declare module 'ytdl-core' {
  interface VideoInfo {
    videoDetails: {
      title: string;
      videoId: string;
      lengthSeconds: string;
    };
  }

  interface Options {
    quality?: string | number;
    filter?: string | ((format: any) => boolean);
    format?: string;
    range?: { start: number; end: number };
    begin?: string | number | Date;
    liveBuffer?: number;
    highWaterMark?: number;
    requestOptions?: any;
    lang?: string;
  }

  function getInfo(url: string): Promise<VideoInfo>;
  function getBasicInfo(url: string): Promise<VideoInfo>;
  function downloadFromInfo(info: VideoInfo, options?: Options): NodeJS.ReadableStream;
  function validateID(string: string): boolean;
  function validateURL(string: string): boolean;
  function getURLVideoID(string: string): string;
  function getVideoID(string: string): string;

  interface ytdl {
    (url: string, options?: Options): NodeJS.ReadableStream;
    getInfo: typeof getInfo;
    getBasicInfo: typeof getBasicInfo;
    downloadFromInfo: typeof downloadFromInfo;
    validateID: typeof validateID;
    validateURL: typeof validateURL;
    getURLVideoID: typeof getURLVideoID;
    getVideoID: typeof getVideoID;
  }

  const ytdl: ytdl;
  export = ytdl;
} 