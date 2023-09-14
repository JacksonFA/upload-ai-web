import { ChangeEvent, FormEvent, useMemo, useRef, useState } from 'react';
import { FileVideo, Upload } from 'lucide-react'
import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from '@/lib/ffmpeg';
import { Button } from "./ui/button";
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { api } from '@/lib/axios';

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'
const statusMessages = {
  converting: 'Convertendo vídeo...',
  uploading: 'Enviando vídeo...',
  generating: 'Gerando transcrição...',
  success: 'Vídeo carregado com sucesso'
}
type VideoInputFormProps = {
  onVideoUploaded: (videoId: string) => void
}

export function VideoInputForm(props: VideoInputFormProps) {
  const [video, setVideo] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('waiting')
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const { files } = event.currentTarget
    if (!files) { return }
    const selectedFile = files[0]
    setVideo(selectedFile)
  }

  async function convertVideoToAudio(video: File) {
    console.log('Convert started.')
    const ffmpeg = await getFFmpeg()
    await ffmpeg.writeFile('input.mp4', await fetchFile(video))
    // ffmpeg.on('log', log => console.log(log.message))
    ffmpeg.on('progress', progress => console.log('Convert progress: ' + Math.round(progress.progress)*100))
    await ffmpeg.exec(['-i', 'input.mp4', '-map', '0:a', '-b:a', '20k', '-acodec', 'libmp3lame', 'output.mp3'])
    const data = await ffmpeg.readFile('output.mp3')
    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', { type: 'audio/mpeg' })
    console.log('Convert finished.')
    return audioFile
  }

  async function handleUploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const prompt = promptInputRef.current?.value
    if (!video) { return }
    setStatus('converting')
    const audioFile = await convertVideoToAudio(video)
    const data = new FormData()
    data.append('file', audioFile)
    setStatus('uploading')
    const response = await api.post('/videos', data)
    console.log(response.data)
    const videoId = response.data.video.id
    setStatus('generating')
    await api.post(`/videos/${videoId}/transcription`, { prompt })
    console.log('Finalizou')
    setStatus('success')
    props.onVideoUploaded(videoId)
  }

  const previewURL = useMemo(() => {
    if (!video) { return null }
    return URL.createObjectURL(video)
  }, [video])

  return (
    <form onSubmit={handleUploadVideo} className='space-y-6'>
      <label
        htmlFor="video"
        className='relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/20'
      >
        {previewURL
          ? (
            <video src={previewURL} controls={false} className='pointer-events-none absolute inset-0' />
          )
          : (
            <>
              <FileVideo className='w-4 h-4' />
              Selecione um vídeo
            </>
          )
        }
      </label>
      <input type="file" id='video' accept='video/mp4' className='sr-only' onChange={handleFileSelected} />
      <Separator />
      <div className='space-y-2'>
        <Label htmlFor='transcription_prompt'>Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          id='transcription_prompt'
          className='h-20 leading-relaxed resize-none'
          placeholder='Inclua palavras-chave no vídeo separadas por vírgula (,)'
        />
      </div>

      <Button
        data-success={status === 'success'}
        disabled={status !== 'waiting'}
        type='submit'
        className='w-full data-[susccess=true]:border-emerald-400'
      >
        {status === 'waiting'
          ? (
            <>
              Carregar vídeo
              <Upload className='w-4 h-4 ml-2' />
            </>
          )
          : statusMessages[status]
        }
      </Button>
    </form>
  )
}