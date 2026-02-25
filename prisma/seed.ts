import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding initial data for production deployment...')

    // Upsert 'Cliente Mostrador' so it always exists
    const mostrador = await prisma.user.upsert({
        where: { email: 'mostrador@odubasolar.local' },
        update: {},
        create: {
            id: 'mostrador',
            name: 'Cliente Mostrador',
            email: 'mostrador@odubasolar.local',
            role: 'CUSTOMER',
            address: 'Local',
            phone: 'N/A'
        },
    })

    console.log('Exito: Cliente por defecto creado ->', mostrador.name)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
