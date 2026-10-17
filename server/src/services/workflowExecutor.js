// workflowExecutor.js — THE seam between recurring schedules/converts and the 29-workflow dispatcher
let impl = null;

export function setExecutor(fn) {
  impl = fn;
}

export async function execute(workflow, payload, ctx) {
  if (!impl) {
    try {
      const t = await import('../routes/transactions.js');
      if (typeof t.executeWorkflow === 'function') {
        impl = t.executeWorkflow;
      }
    } catch {}
  }
  if (impl) return impl(workflow, payload, ctx);
  throw new Error('WORKFLOW_EXECUTOR_NOT_WIRED — export executeWorkflow(workflow, payload, ctx) from routes/transactions.js');
}

export default { execute, setExecutor };
