import { useCallback, type ChangeEvent } from 'react'
import { useChatStore } from '../../stores/chatStore'

export function ModelSelector() {
  const activeModel = useChatStore((s) => s.activeModel)
  const availableModels = useChatStore((s) => s.availableModels)
  const setActiveModel = useChatStore((s) => s.setActiveModel)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const model = availableModels.find((m) => m.id === e.target.value)
      if (model) {
        setActiveModel(model)
      }
    },
    [availableModels, setActiveModel],
  )

  return (
    <div className="model-selector">
      <select
        className="model-selector__select"
        value={activeModel.id}
        onChange={handleChange}
      >
        {availableModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}
