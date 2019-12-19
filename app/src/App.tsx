import React from 'react';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import './App.css';
import { HomeView } from './views/HomeView/HomeView';
import { InstallationView } from './views/InstallationView/InstallationView';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/installation/:installationId">
          <InstallationView />
        </Route>
        <Route path="/">
          <HomeView />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
