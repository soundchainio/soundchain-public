export function delayFocus(selector: string): void {
  setTimeout(() => {
    const element: HTMLElement | null = document.querySelector(selector)
    if (element) {
      element.focus()
    } else {
      delayFocus(selector)
    }
  }, 300)
}