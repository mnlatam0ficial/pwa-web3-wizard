(function () {
  'use strict';
  let provider = null, signer = null, account = null, contract = null, contractAddress = null;
  const $ = (id) => document.getElementById(id);
  function showStatus(msg, type = 'info') { const el = $('statusBox'); el.className = `status status-${type}`; el.textContent = msg; el.classList.remove('hidden'); }
  function hideStatus() { $('statusBox').classList.add('hidden'); }
  async function connect() {
    try {
      if (!window.ethereum) { showStatus('No se detectó wallet', 'err'); return; }
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }); account = accounts[0]; provider = new ethers.BrowserProvider(window.ethereum); signer = await provider.getSigner();
      $('walletShort').textContent = account.slice(0, 6) + '…' + account.slice(-4); $('sectionConnect').classList.add('hidden'); $('sectionConsole').classList.remove('hidden');
      const net = await provider.getNetwork(); $('networkName').textContent = net.name || `Chain ${net.chainId}`;
      const saved = localStorage.getItem('ap_contract');
      if (saved) { contractAddress = saved; contract = new ethers.Contract(saved, CONTRACT.abi, signer); $('contractShort').textContent = saved.slice(0, 8) + '…' + saved.slice(-6); await refreshStatus(); $('btnEnable').disabled = false; $('btnDisable').classList.remove('hidden'); }
      showStatus('Wallet conectada', 'ok'); setTimeout(hideStatus, 2000);
      window.ethereum.on('accountsChanged', () => location.reload()); window.ethereum.on('chainChanged', () => location.reload());
    } catch (e) { showStatus(e.message || String(e), 'err'); }
  }
  async function refreshStatus() {
    if (!contract) return; try { const active = await contract.protocolActive(); $('protocolStatus').textContent = active ? 'Activo' : 'Pausado'; $('protocolStatus').className = active ? 'font-medium text-emerald-400' : 'font-medium text-amber-400'; if (active) { $('btnEnable').classList.add('hidden'); $('btnDisable').classList.remove('hidden'); } else { $('btnEnable').classList.remove('hidden'); $('btnDisable').classList.add('hidden'); } } catch (_) {}
  }
  async function deploy() {
    try {
      if (!signer) return showStatus('Conecta wallet primero', 'err'); if (!CONTRACT.bytecode || CONTRACT.bytecode === '0x') { showStatus('Falta el bytecode. Compila el contrato en Remix y pégalo en js/contracts-repo.js', 'err'); return; }
      showStatus('Desplegando… confirma en wallet', 'info'); $('btnDeploy').disabled = true;
      const factory = new ethers.ContractFactory(CONTRACT.abi, CONTRACT.bytecode, signer); const name = 'Digital Asset', symbol = 'DAT', supply = 1000000, treasury = account;
      const c = await factory.deploy(name, symbol, supply, treasury); showStatus('Tx enviada, esperando confirmación…', 'info'); await c.waitForDeployment(); contractAddress = await c.getAddress(); contract = c; localStorage.setItem('ap_contract', contractAddress);
      $('contractShort').textContent = contractAddress.slice(0, 8) + '…' + contractAddress.slice(-6); $('resultBox').innerHTML = `<p class="text-emerald-300 mb-1">Contrato desplegado</p><p>${contractAddress}</p>`; $('resultBox').classList.remove('hidden'); $('btnEnable').disabled = false; await refreshStatus(); showStatus('Despliegue completado', 'ok');
    } catch (e) { showStatus(e.reason || e.message || String(e), 'err'); } finally { $('btnDeploy').disabled = false; }
  }
  async function setProtocol(active) { try { if (!contract) return showStatus('Despliega primero', 'err'); showStatus(active ? 'Activando protocolo…' : 'Pausando…', 'info'); const tx = await contract.setProtocolState(active); await tx.wait(); await refreshStatus(); showStatus(active ? 'Protocolo ACTIVADO' : 'Protocolo pausado', 'ok'); } catch (e) { showStatus(e.reason || e.message || String(e), 'err'); } }
  async function setDefaultFee() { try { if (!contract) return showStatus('Despliega primero', 'err'); showStatus('Ajustando fee…', 'info'); const tx = await contract.setFee(250, 800); await tx.wait(); showStatus('Fee actualizado (2.5% normal / 8% inicial)', 'ok'); } catch (e) { showStatus(e.reason || e.message || String(e), 'err'); } }
  async function exemptSelf() { try { if (!contract) return showStatus('Despliega primero', 'err'); showStatus('Eximiendo dirección…', 'info'); const tx = await contract.setExempt(account, true); await tx.wait(); showStatus('Tu dirección ahora está exenta', 'ok'); } catch (e) { showStatus(e.reason || e.message || String(e), 'err'); } }
  document.addEventListener('DOMContentLoaded', () => { $('btnConnect').onclick = connect; $('btnDeploy').onclick = deploy; $('btnEnable').onclick = () => setProtocol(true); $('btnDisable').onclick = () => setProtocol(false); $('btnSetFee').onclick = setDefaultFee; $('btnExemptSelf').onclick = exemptSelf; });
})();
