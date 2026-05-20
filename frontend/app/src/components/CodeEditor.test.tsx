import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestWrapper } from '../test/test-utils'
import { CodeEditor } from './CodeEditor'

// Monaco no se carga en jsdom (es un wrapper pesado del editor del navegador).
// Lo mockeamos por un <textarea> simple que reproduce el contrato:
//   <Editor value={...} onChange={(value) => void} ... />
vi.mock('@monaco-editor/react', () => ({
  default: ({
    value,
    onChange,
  }: {
    value?: string
    onChange?: (v: string | undefined) => void
  }) => (
    <textarea
      data-testid="monaco-editor-mock"
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

describe('CodeEditor — RF-16 (respuesta en código)', () => {
  it('should render the language selector defaulting to JavaScript', () => {
    render(<CodeEditor />, { wrapper: TestWrapper })

    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    // El valor visible del Select de antd es "JavaScript" por defecto.
    expect(screen.getByText(/JavaScript/i)).toBeInTheDocument()
  })

  it('should render the editor and a copy button', () => {
    render(<CodeEditor />, { wrapper: TestWrapper })

    expect(screen.getByTestId('monaco-editor-mock')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should expose the default value provided via props', () => {
    render(<CodeEditor defaultValue="console.log(1)" />, { wrapper: TestWrapper })

    const editor = screen.getByTestId('monaco-editor-mock') as HTMLTextAreaElement
    expect(editor.value).toBe('console.log(1)')
  })

  it('should call onChange when the user types code', () => {
    const onChange = vi.fn()
    render(<CodeEditor onChange={onChange} />, { wrapper: TestWrapper })

    const editor = screen.getByTestId('monaco-editor-mock')
    fireEvent.change(editor, { target: { value: 'const x = 42' } })

    expect(onChange).toHaveBeenCalledWith('const x = 42')
  })

  it('should copy the current code via navigator.clipboard.writeText on copy button click', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    // `userEvent.setup()` (v14) instala su propio stub de
    // `navigator.clipboard`, sobreescribiendo cualquier mock previo. Para
    // este test usamos `fireEvent.click` directamente, que no toca el
    // clipboard y deja en pie nuestra asignación.
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      writable: true,
      value: { writeText },
    })

    render(<CodeEditor defaultValue="hello" />, { wrapper: TestWrapper })

    const buttons = screen.getAllByRole('button')
    const copyBtn = buttons.find((b) => b.querySelector('.anticon-copy')) ?? buttons[0]
    fireEvent.click(copyBtn)

    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('should disable the language selector when readOnly=true', () => {
    render(<CodeEditor readOnly />, { wrapper: TestWrapper })

    // antd añade la clase `ant-select-disabled` al wrapper del Select cuando
    // está deshabilitado. Señal estable entre versiones del componente.
    const wrapper = screen.getByRole('combobox').closest('.ant-select')
    expect(wrapper).toHaveClass('ant-select-disabled')
  })
})
