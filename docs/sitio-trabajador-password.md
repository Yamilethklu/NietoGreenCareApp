# Cambio necesario en el sitio (repositorio del sitio, Vercel)

En `src/app/api/admin/operations/route.ts`, dentro de `body.action==='worker'`, después de insertar en
`crew_members` correctamente, crear el acceso con contraseña si viene `body.password`:

```ts
if (typeof body.password === 'string' && body.password.length >= 8) {
  const { error: authError } = await db.auth.admin.createUser({
    email: worker.email, password: body.password, email_confirm: true,
  });
  if (authError && !/already|registered/i.test(authError.message))
    return fail('Trabajador guardado, pero no se pudo crear su contraseña: ' + authError.message, 409);
}
```

`db` debe ser el cliente con la clave de servicio (solo en el servidor). Esa clave nunca va en la app.
