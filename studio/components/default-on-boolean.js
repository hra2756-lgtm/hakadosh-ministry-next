// Existing documents have no value yet; show the same default as the website.
export function DefaultOnBoolean(props) {
  return props.renderDefault({ ...props, value: props.value !== false })
}
