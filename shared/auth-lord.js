let identity = { id: 'local-user', email: null, name: 'Local User' };
const AuthLord = {
  install() {
    try { window.AuthLord = this } catch (_) {}
    try {
      const k = window.AuthKernel;
      if (k) {
        k.on = function(){}; k.subscribe = function(){}; k.executeCommand = function(){}; k.refreshFromAdapter = function(){};
        k.getState = function(){ return { status:'authenticated', identity } };
      }
    } catch (_){ }
  },
  getAuthState() { return { status: 'authenticated', identity } },
  assertAuthenticated() { return true },
  getIdentity() { return identity },
  setIdentity(next) { identity = { ...identity, ...(next||{}) }; return identity }
};
export { AuthLord };
