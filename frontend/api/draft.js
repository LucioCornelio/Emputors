export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Falta el ID del draft' });
  }

  try {
    const fetchResponse = await fetch(`https://aoe2cm.net/api/draft/${id}`);
    
    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({ error: 'Error al consultar Captain Mode' });
    }
    
    const data = await fetchResponse.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Fallo de conexion' });
  }
}