#!/usr/bin/env bash
# Batch clip producer.
# Input: songs.csv with header:  source_file,title,album,year,difficulty,clip_start_seconds
#   (source_file = path to your full mp3)
# Output: clips/<uuid>.mp3 (16s, mono, 96kbps) + manifest.csv for DB seeding.
set -euo pipefail
IN="${1:-songs.csv}"
mkdir -p clips
echo "uuid,title,artist,album,year,difficulty,clip_path" > manifest.csv
ARTIST="${ARTIST:-Seedhe Maut}"

tail -n +2 "$IN" | while IFS=, read -r src title album year diff start; do
  id=$(uuidgen | tr 'A-Z' 'a-z')
  ffmpeg -hide_banner -loglevel error -ss "$start" -t 16 -i "$src" \
    -ac 1 -b:a 96k \
    -af "afade=t=in:d=0.05,afade=t=out:st=15.7:d=0.3" \
    "clips/${id}.mp3"
  # clip_path is the R2 object key. Files are uploaded to the bucket ROOT,
  # so the key is just "<id>.mp3" (no "clips/" prefix). R2_PUBLIC_BASE_URL +
  # "/" + clip_path must resolve to a real object.
  echo "${id},\"${title}\",\"${ARTIST}\",\"${album}\",${year},${diff},${id}.mp3" >> manifest.csv
  echo "OK ${title}"
done
echo "Done. Upload the CONTENTS of clips/ to the R2 bucket root"
echo "(e.g. rclone copy clips/ r2:pehchaan-clips/), then:"
echo "  python scripts/manifest-to-sql.py manifest.csv > seed.sql"
