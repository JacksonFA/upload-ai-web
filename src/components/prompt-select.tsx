import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

type Prompt = {
  id: string
  title: string
  template: string
}

type PromptSelectProps = {
  onPromptSelected: (template: string) => void
}

export function PromptSelect(props: PromptSelectProps) {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)
  
  useEffect(() => {
    api.get('/prompts').then(response => {
      setPrompts(response.data)
    })
  }, [])

  function handlePromptSelected(id: string) {
    const selectedPrompt = prompts?.find(prompt => prompt.id === id)
    if (!selectedPrompt) { return }
    props.onPromptSelected(selectedPrompt.template)
  }

  return (
    <Select onValueChange={handlePromptSelected}>
      <SelectTrigger>
        <SelectValue placeholder='Selecione um prompt...' />
      </SelectTrigger>
      <SelectContent>
        {prompts?.map(prompt => (
          <SelectItem key={prompt.id} value={prompt.id}>{prompt.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}