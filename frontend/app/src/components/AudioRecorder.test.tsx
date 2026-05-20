import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AudioRecorder } from './AudioRecorder'

// Mock del API MediaRecorder (no existe en jsdom).
class MockMediaRecorder {
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  state = 'inactive'
  constructor(public stream: MediaStream) {}
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    // Simula que un chunk llegó y luego onstop.
    this.ondataavailable?.({ data: new Blob(['fake-audio'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

const mockGetTracks = vi.fn().mockReturnValue([{ stop: vi.fn() }])
const mockGetUserMedia = vi.fn()

beforeEach(() => {
  // @ts-expect-error — overriding the read-only DOM type.
  global.MediaRecorder = MockMediaRecorder
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: mockGetUserMedia },
  })
  mockGetUserMedia.mockResolvedValue({ getTracks: mockGetTracks })
})

describe('AudioRecorder — RF-17 (respuesta en audio)', () => {
  it('should render a "Grabar audio" button initially', () => {
    render(<AudioRecorder onRecorded={vi.fn()} />)

    expect(screen.getByRole('button', { name: /grabar audio/i })).toBeInTheDocument()
  })

  it('should switch to a "Detener" button while recording', async () => {
    const user = userEvent.setup()
    render(<AudioRecorder onRecorded={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /grabar audio/i }))

    expect(await screen.findByRole('button', { name: /detener/i })).toBeInTheDocument()
    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
  })

  it('should call onRecorded with the resulting Blob after stop', async () => {
    const user = userEvent.setup()
    const onRecorded = vi.fn()
    render(<AudioRecorder onRecorded={onRecorded} />)

    await user.click(screen.getByRole('button', { name: /grabar audio/i }))
    await user.click(await screen.findByRole('button', { name: /detener/i }))

    expect(onRecorded).toHaveBeenCalledTimes(1)
    const blob = onRecorded.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('audio/webm')
  })

  it('should switch the button to "Grabar de nuevo" after a recording is captured', async () => {
    const user = userEvent.setup()
    render(<AudioRecorder onRecorded={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /grabar audio/i }))
    await user.click(await screen.findByRole('button', { name: /detener/i }))

    expect(await screen.findByRole('button', { name: /grabar de nuevo/i })).toBeInTheDocument()
    expect(screen.getByText(/audio grabado/i)).toBeInTheDocument()
  })

  it('should clear the recorded state when the delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<AudioRecorder onRecorded={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /grabar audio/i }))
    await user.click(await screen.findByRole('button', { name: /detener/i }))

    // El botón de borrar es un icon-button (sin nombre accesible); se
    // identifica por ser el último botón "type=text" del componente. RTL
    // expone todos los botones del documento; tomamos el de delete por
    // su `class*=type-text`. Como antd no expone aria-label aquí, usamos
    // queryAllByRole y nos quedamos con el que NO sea "grabar de nuevo".
    const buttons = screen.getAllByRole('button')
    const deleteBtn = buttons.find((b) => b.textContent === '' || b.querySelector('.anticon-delete'))
    if (deleteBtn) {
      await user.click(deleteBtn)
    }

    expect(screen.queryByText(/audio grabado/i)).not.toBeInTheDocument()
  })

  it('should disable the button when prop disabled=true', () => {
    render(<AudioRecorder onRecorded={vi.fn()} disabled />)

    expect(screen.getByRole('button', { name: /grabar audio/i })).toBeDisabled()
  })

  it('should gracefully handle getUserMedia rejection (no crash)', async () => {
    const user = userEvent.setup()
    mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'))
    const onRecorded = vi.fn()
    render(<AudioRecorder onRecorded={onRecorded} />)

    await user.click(screen.getByRole('button', { name: /grabar audio/i }))

    // El botón sigue siendo "Grabar audio" (no transitó a "Detener").
    expect(screen.getByRole('button', { name: /grabar audio/i })).toBeInTheDocument()
    expect(onRecorded).not.toHaveBeenCalled()
  })
})
