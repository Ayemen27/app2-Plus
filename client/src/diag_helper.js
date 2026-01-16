export function logDiag(msg) {
  console.log('DIAG MODULE: ' + msg);
  const diag = document.getElementById('diagnostic');
  if (diag) diag.innerText += ' -> ' + msg;
}
