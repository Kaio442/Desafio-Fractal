import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'https://desafio-fractal-api.onrender.com/api/clients';

function App() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Estados da Importação CSV (Parte 2)
  const [importSummary, setImportSummary] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: ''
  });

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    try {
      const response = await axios.get(API_URL, {
        params: { nome: search }
      });
      setClients(response.data);
    } catch (error) {
      console.error('Erro ao procurar clientes:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({ nome: '', telefone: '', email: '', endereco: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (client) => {
    setEditingClient(client);
    setFormData({
      nome: client.nome,
      telefone: client.telefone,
      email: client.email,
      endereco: client.endereco
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await axios.put(`${API_URL}/${editingClient._id}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }
      closeModal();
      fetchClients();
    } catch (error) {
      console.error('Erro ao guardar cliente:', error);
    }
  };

  // Tratamento da importação de CSV
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    setIsUploading(true);
    try {
      const response = await axios.post(`${API_URL}/import`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportSummary(response.data);
      setIsImportModalOpen(true);
      fetchClients();
    } catch (error) {
      alert('Falha ao importar o ficheiro CSV. Verifique a consola.');
      console.error(error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Gestão de Clientes</h1>
        <div className="header-actions">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleFileUpload}
          />
          <button 
            className="btn-secondary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'A importar...' : '↑ Importar CSV'}
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            + Novo Cliente
          </button>
        </div>
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Filtrar clientes por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>E-mail</th>
              <th>Endereço</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client._id}>
                  <td>{client.nome}</td>
                  <td>{client.telefone}</td>
                  <td>{client.email}</td>
                  <td>{client.endereco}</td>
                  <td>
                    <button className="btn-edit" onClick={() => openEditModal(client)}>
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty-message">Nenhum cliente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Cadastro/Edição */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome:</label>
                <input
                  type="text"
                  name="nome"
                  required
                  value={formData.nome}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Telefone:</label>
                <input
                  type="text"
                  name="telefone"
                  required
                  value={formData.telefone}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>E-mail:</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Endereço:</label>
                <input
                  type="text"
                  name="endereco"
                  required
                  value={formData.endereco}
                  onChange={handleInputChange}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Relatório de Importação CSV */}
      {isImportModalOpen && importSummary && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Resultado da Importação</h2>
            <div className="import-stats">
              <div className="stat-card">
                <span>Lidos</span>
                <strong>{importSummary.totalLidos}</strong>
              </div>
              <div className="stat-card success">
                <span>Inseridos</span>
                <strong>{importSummary.inseridos}</strong>
              </div>
              <div className="stat-card danger">
                <span>Falhas</span>
                <strong>{importSummary.falhas}</strong>
              </div>
            </div>

            {importSummary.relatorioErros.length > 0 && (
              <div className="error-log">
                <h3>Registos com erro:</h3>
                <ul>
                  {importSummary.relatorioErros.map((item, idx) => (
                    <li key={idx}>
                      Linha {item.linha}: {item.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setIsImportModalOpen(false)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;