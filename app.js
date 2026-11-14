(() => {
  const $ = id => document.getElementById(id);
  const logLines = [];
  const log = (message, details) => {
    const line = `${new Date().toLocaleTimeString()} ${message}${details ? '\n' + String(details) : ''}`;
    logLines.push(line); $('log').textContent = logLines.join('\n\n');
  };
  const status = (id, message, ok = null) => { const el = $(id); el.textContent = message; el.className = ok === null ? '' : (ok ? 'good' : 'bad'); };
  const clientIdKey = 'phase0_google_client_id';
  const sheetIdKey = 'phase0_spreadsheet_id';
  $('clientId').value = localStorage.getItem(clientIdKey) || '';
  $('sheetId').value = localStorage.getItem(sheetIdKey) || '';
  $('origin').textContent = `Current origin: ${location.origin}`;
  let token = null, tokenClient = null, busy = false;
  $('saveConfig').onclick = () => {
    localStorage.setItem(clientIdKey, $('clientId').value.trim());
    log('Client ID saved locally.');
  };
  $('copy').onclick = async () => {
    try { await navigator.clipboard.writeText(logLines.join('\n\n')); log('Diagnostics copied.'); }
    catch (e) { log('Could not copy diagnostics', e.message); }
  };
  const googleReady = () => !!window.google?.accounts?.oauth2;
  $('connect').onclick = () => {
    const clientId = $('clientId').value.trim();
    if (!clientId.endsWith('.apps.googleusercontent.com')) return status('authStatus', 'Enter a valid Web application client ID.', false);
    localStorage.setItem(clientIdKey, clientId);
    if (!googleReady()) return status('authStatus', 'Google sign-in script not loaded. Check connectivity and reload.', false);
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: response => {
          if (response.error || !response.access_token) {
            status('authStatus', `Google authorization failed: ${response.error || 'no token'}`, false);
            log('Authorization response error', JSON.stringify({error:response.error,error_description:response.error_description}));
            return;
          }
          token = response.access_token;
          status('authStatus', 'Connected for this session ✓', true);
          $('test').disabled = false;
          log('Google OAuth access token received (token not logged).');
        },
        error_callback: e => { status('authStatus', `Google popup error: ${e.type || 'unknown'}`, false); log('OAuth popup error', JSON.stringify(e)); }
      });
      tokenClient.requestAccessToken({prompt: 'consent'});
      status('authStatus', 'Waiting for Google authorization…');
      log('Google authorization requested.');
    } catch (e) { status('authStatus', e.message, false); log('Authorization exception', e.message); }
  };
  async function googleApi(path, options = {}) {
    if (!token) throw new Error('Not signed in. Tap Connect Google again.');
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets' + path, {
      ...options,
      headers: {Authorization: `Bearer ${token}`, ...(options.body ? {'Content-Type':'application/json'} : {}), ...options.headers}
    });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = {raw:text}; }
    if (!response.ok) {
      if (response.status === 401) { token = null; $('test').disabled = true; status('authStatus','Session expired. Connect Google again.',false); }
      throw new Error(`HTTP ${response.status}: ${data.error?.message || text.slice(0,300)}`);
    }
    return data;
  }
  $('test').onclick = async () => {
    if (busy) return; busy = true; $('test').disabled = true;
    status('testStatus', 'Testing…');
    try {
      let sheetId = $('sheetId').value.trim();
      if (!sheetId) {
        log('Creating a new spreadsheet…');
        const created = await googleApi('', {method:'POST', body:JSON.stringify({properties:{title:'Workout App Phase 0 Test'},sheets:[{properties:{title:'Phase0'}}]})});
        sheetId = created.spreadsheetId;
        $('sheetId').value = sheetId;
        log('Spreadsheet created successfully.');
      }
      localStorage.setItem(sheetIdKey, sheetId);
      const metadata = await googleApi('/' + encodeURIComponent(sheetId) + '?fields=sheets.properties.title');
      const tab = metadata.sheets?.[0]?.properties?.title;
      if (!tab) throw new Error('Spreadsheet has no tabs.');
      const uniqueId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const row = [uniqueId, new Date().toISOString(), 'Phase 0', 'Google Sheets connection test', 'SUCCESS'];
      const range = encodeURIComponent(`'${tab.replaceAll("'", "''")}'!A:E`);
      log('Appending test row…');
      await googleApi(`/${encodeURIComponent(sheetId)}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {method:'POST',body:JSON.stringify({values:[row]})});
      log('Reading back test row…');
      const result = await googleApi(`/${encodeURIComponent(sheetId)}/values/${range}`);
      const found = result.values?.some(r => r[0] === uniqueId && r[4] === 'SUCCESS');
      if (!found) throw new Error('Write completed, but the test row was not found when reading back.');
      status('testStatus', 'SUCCESS: Test workout saved to Google Sheets and verified ✓', true);
      const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/edit`;
      $('sheetLink').replaceChildren();
      const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Open test spreadsheet'; $('sheetLink').append(a);
      log('SUCCESS: write and read-back verified.');
    } catch (e) { status('testStatus', `FAILED: ${e.message}`, false); log('Test failed', e.message); }
    finally { busy = false; $('test').disabled = !token; }
  };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').then(() => log('Service worker registered.')).catch(e => log('Service worker failed', e.message));
  log(`App loaded. Origin: ${location.origin}. Display mode: ${matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'}. Online: ${navigator.onLine}.`);
})();
