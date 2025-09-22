/**
 * テキストの改行をHTMLの<br>タグに変換する
 * @param text 変換するテキスト
 * @returns HTMLタグを含む文字列
 */
export function convertNewlinesToHtml(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\r\n/g, '<br>') // Windows形式の改行
    .replace(/\n/g, '<br>')   // Unix形式の改行
    .replace(/\r/g, '<br>');  // Mac形式の改行
}

/**
 * HTMLタグをエスケープして安全に表示する
 * @param text エスケープするテキスト
 * @returns エスケープされた文字列
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 改行をHTMLに変換し、HTMLタグも安全に処理する
 * @param text 処理するテキスト
 * @returns 安全なHTML文字列
 */
export function processDescriptionText(text: string): string {
  if (!text) return '';

  // 句読点の後に改行を追加する処理を試す
  let processedText = text;

  // 句読点（。、）の後に改行を追加
  processedText = processedText.replace(/。/g, '。<br>');
  processedText = processedText.replace(/、/g, '、<br>');

  // その他の区切り文字でも改行を追加
  processedText = processedText.replace(/»/g, '»<br>');
  processedText = processedText.replace(/ã/g, 'ã<br>');

  // 既存の改行文字も処理
  processedText = convertNewlinesToHtml(processedText);

  // 既にHTMLタグが含まれている場合はそのまま返す
  if (processedText.includes('<') && processedText.includes('>')) {
    return processedText;
  }

  // HTMLタグが含まれていない場合はエスケープしてから改行を変換
  const result = convertNewlinesToHtml(escapeHtml(text));
  return result;
}
