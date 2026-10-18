UPDATE "tutorial_videos"
SET "status" = 'ARCHIVED', "updated_at" = now()
WHERE "youtube_video_id" IN (
  '1SFf_QTlVfo',
  'B06932o_Xmk',
  'MXihzf3EcRU',
  'T_qUw7aw-T8',
  'XTKhDqj-u0Q',
  'dOA3MAKd17g',
  'mD4h1i7woDo'
);
--> statement-breakpoint

UPDATE "tutorial_videos"
SET "language" = 'am', "updated_at" = now()
WHERE "youtube_video_id" IN ('4Coyr22CdLg', 'UN5Uj48jYT4');
