import { Request, Response } from 'express'
import { getCustomRepository } from "typeorm"
import { UsersRepository } from "../repositories/UserRepository"
import { SurveysRepository } from "../repositories/SurveysRepository"
import { SurveysUsersRepository } from "../repositories/SurveysUsersRepository"
import SendMailService from '../services/SendMailService'

import { resolve } from 'path'
import { AppError } from '../errors/appError'

class SendMailController {

    async execute(request: Request, response: Response) {
        const {email, survey_id} = request.body

        const usersRepository = getCustomRepository(UsersRepository)
        const surveysRepository = getCustomRepository(SurveysRepository)
        const surveysUsersRepository = getCustomRepository(SurveysUsersRepository)

        const userAlreadyExists = await usersRepository.findOne({
            email
        })

        if (!userAlreadyExists) {
            throw new AppError("User does not exists!")
        }

        const surveyAlreadyExists = await surveysRepository.findOne({
            id: survey_id
        })

        if (!surveyAlreadyExists) {
            throw new AppError("Survey does not exists!")
        }

        const npsPath = resolve(__dirname, "..", "views", "emails", "npsMail.hbs")

        const surveyUsersAlreadyExists = await surveysUsersRepository.findOne({
            where: {
                user_id: userAlreadyExists.id, 
                value: null
            },
            relations: ["user", "survey"],
        })

        const variables = {
            name: userAlreadyExists.name,
            title: surveyAlreadyExists.title,
            description: surveyAlreadyExists.description,
            id: surveyUsersAlreadyExists.id,
            link: process.env.URL_MAIL,
        }

        if(surveyUsersAlreadyExists) {
            variables.id = surveyUsersAlreadyExists.id,
            await SendMailService.execute(email, surveyAlreadyExists.title, variables, npsPath)
            return response.json(surveyAlreadyExists)
        }

        const surveyUser = surveysUsersRepository.create({
            user_id: userAlreadyExists.id,
            survey_id
        })
        await surveysUsersRepository.save(surveyUser)

        variables.id = surveyUser.id,

        await SendMailService.execute(email, surveyAlreadyExists.title, variables, npsPath)

        return response.json(surveyUser)
    }
}

export { SendMailController }
