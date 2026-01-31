from nicegui import ui

def root():
    user_input = ui.input(value='Hello')
    ui.label().bind_text_from(user_input, 'value', reverse)

def reverse(text: str) -> str:
    return text[::-1]

ui.run(root)