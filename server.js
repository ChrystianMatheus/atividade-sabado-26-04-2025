import express from "express"
import cors from "cors"
import fs from "node:fs"
import { type } from "node:os"
import { json } from "node:stream/consumers"

const PORT = 3333
const url_database = "./database/participantes.json"

const app = express()
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}))
app.use(express.json())

// Isso é pra ler os participantes
const readParticipants = () => {
  try {
    const data = fs.readFileSync(url_database, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error("Erro ao ler o arquivo de participantes:", error)
    return []
  }
};

// Aqui é pra salvar os dados dos participantes no Json
const saveParticipants = (participants) => {
  try {
    fs.writeFileSync(url_database, JSON.stringify(participants, null, 2))
    return true
  } catch (error) {
    console.error("Erro ao salvar o arquivo de participantes:", error)
    return false
  }
}

// POST /participants
app.post("/participants", (request, response) => {
  const { nome, email, senha, idade, cidade } = request.body

  if (!nome || !email || !senha || !idade || !cidade) {
    return response.status(400).json({ mensagem: "Todos os campos são obrigatórios." })
  }

  if (typeof nome !== 'string' || typeof email !== 'string' || typeof senha !== 'string' || typeof cidade !== 'string') {
    return response.status(400).json({ mensagem: "Todos os camposas temq ser string." })
  }

  if (typeof idade !== 'number' || idade < 16) {
    return response.status(400).json({ mensagem: "A idade ser um número e ser igual ou superior a 16 anos." })
  }

  const participants = readParticipants();
  if (participants.some(p => p.email === email)) {
    return response.status(409).json({ mensagem: "Esse e-mail está cadastrado." })
  }

  const novoParticipante = {
    id: Date.now().toString(),
    nome,
    email,
    senha, 
    idade,
    cidade
  }

  participants.push(novoParticipante)

  if (saveParticipants(participants)) {
    response.status(201).json({ mensagem: "Participante cadastrado com sucesso!", data: novoParticipante })
  } else {
    response.status(500).json({ mensagem: "Erro ao salvar o participante." })
  }
})

// GET /participants
app.get("/participants", (request, response) => {
  const participants = readParticipants()
  response.status(200).json(participants)
})

// GET /participants/{id}
app.get("/participants/:id", (request, response) => {
  const { id } = request.params
  const participants = readParticipants()
  const participante = participants.find(p => p.id === id)

  if (participante) {
    response.status(200).json(participante)
  } else {
    response.status(404).json({ mensagem: "Participante não encontrado." })
  }
})

// PUT /participants/{id}
app.put("/participants/:id", (request, response) => {
  const {id} = request.params
  const {nome, email, senha, idade, cidade} = request.body

  if (!nome && !email && !senha && !idade && !cidade) {
    return response.status(400).json({ mensagem: "Tem que digitar em algum espaço" })
  }

  if (idade !== undefined && (typeof idade !== 'number' || idade < 16)) {
    return response.status(400).json({ mensagem: "A idade deve ser número e igual ou maior que 16." })
  }

  const participants = readParticipants()
  const indexParticipante = participants.findIndex(p => p.id === id)

  if (indexParticipante === -1) {
    return response.status(404).json({ mensagem: "Participante não encontrado." })
  }

  const participanteExistente = participants[indexParticipante]

  if (email && email !== participanteExistente.email && participants.some(p => p.email === email)) {
    return response.status(409).json({ mensagem: "Este e-mail já está cadastrado." })
  }

  const participanteAtualizado = {
    ...participanteExistente,
    nome: nome !== undefined ? nome : participanteExistente.nome,
    email: email !== undefined ? email : participanteExistente.email,
    senha: senha !== undefined ? senha : participanteExistente.senha, 
    idade: idade !== undefined ? idade : participanteExistente.idade,
    cidade: cidade !== undefined ? cidade : participanteExistente.cidade
  }

  participants[indexParticipante] = participanteAtualizado;

  if (saveParticipants(participants)) {
    response.status(200).json({ mensagem: "Participante atualizado com sucesso!", data: participanteAtualizado })
  } else {
    response.status(500).json({ mensagem: "Erro ao atualizar o participante." })
  }
});

// DELETE /participants/{id}
app.delete("/participants/:id", (request, response) => {
  const {id} = request.params
  const participants = readParticipants()
  const indexParticipante = participants.findIndex(p => p.id === id)

  if (indexParticipante === -1) {
    return response.status(404).json({ mensagem: "Participante não encontrado." })
  }

  const participanteRemovido = participants.splice(indexParticipante, 1)

  if (saveParticipants(participants)) {
    response.status(200).json({ mensagem: "Participante removido com sucesso!", data: participanteRemovido[0] })
  } else {
    response.status(500).json({ mensagem: "Erro ao remover o participante." })
  }
})

// GET /participants/count
app.get("/participants/count", (request, response) => {
  const participants = readParticipants()
  response.status(200).json({ total: participants.length })
})

// GET /participants/count/over18
app.get("/participants/count/over18", (request, response) => {
  const participants = readParticipants()
  const maioresDe18 = participants.filter(p => p.idade >= 18).length
  response.status(200).json({ maioresDe18 })
})

// GET /participants/city/most
app.get("/participants/city/most", (request, response) => {
  const participants = readParticipants()
  if (participants.length === 0) {
    return response.status(200).json({ cidadeComMaisParticipantes: null, total: 0 })
  }

  const contagemCidades = participants.reduce((acc, p) => {
    acc[p.cidade] = (acc[p.cidade] || 0) + 1
    return acc;
  }, {})

  let cidadeComMaisParticipantes = null
  let maxParticipantes = 0

  for (const cidade in contagemCidades) {
    if (contagemCidades[cidade] > maxParticipantes) {
      maxParticipantes = contagemCidades[cidade]
      cidadeComMaisParticipantes = cidade
    }
  }

  response.status(200).json({ cidadeComMaisParticipantes, total: maxParticipantes })
})

app.listen(PORT, () => {
  console.log(`Servidor iniciado em http://localhost:3333`)
})