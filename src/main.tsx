import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<main className="flow-page"><h1>Something went wrong.</h1><p>Reload to restore your last saved career.</p><button className="primary" onClick={()=>location.reload()}>Reload game</button><button className="secondary" onClick={()=>{localStorage.removeItem('pocket-football-gm-v1');location.reload();}}>Reset saved career</button></main>:this.props.children;}}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);
